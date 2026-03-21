import { TelegramClient, Api } from "telegram";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { Plugin, CommandDefinition } from "../types/index.js";
import { db } from "../utils/database.js";
import { logger } from "../utils/logger.js";

interface LoadedPlugin {
  instance: Plugin;
  path: string;
  isBuiltin: boolean;
}

interface RegisteredCommand {
  plugin: string;
  def: CommandDefinition;
  name: string;
  aliasOf?: string;
  source: "commands" | "cmdHandlers";
}

export interface ParsedCommand {
  prefix: string;
  raw: string;
  name: string;
  args: string[];
}

const DEFAULT_PREFIX = ".";
const DEV_PREFIXES = ["!", "！"];

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeCommandName(name: string): string {
  return name.trim().toLowerCase();
}

/** 普通模块加载（利用运行时缓存，适合首次加载） */
function importModule(filePath: string) {
  const fileUrl = pathToFileURL(filePath);
  return import(fileUrl.href);
}

/** Cache-busting 加载（跳过缓存，仅用于热重载 reloadPlugin） */
function importFreshModule(filePath: string) {
  const fileUrl = pathToFileURL(filePath);
  fileUrl.searchParams.set("t", Date.now().toString());
  return import(fileUrl.href);
}

function getPluginFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => {
      const lower = file.toLowerCase();
      return (
        (lower.endsWith(".ts") || lower.endsWith(".js")) &&
        !lower.endsWith(".d.ts")
      );
    })
    .sort((a, b) => a.localeCompare(b));
}

function getConfiguredPrefixes(): string[] {
  const envPrefixes =
    process.env.CMD_PREFIX?.split(/\s+/g)
      .map((item) => item.trim())
      .filter(Boolean) || [];

  if (envPrefixes.length > 0) {
    return uniqueStrings(envPrefixes);
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_PREFIXES;
  }

  return [DEFAULT_PREFIX];
}

export function getCommandPrefixes(): string[] {
  return getConfiguredPrefixes();
}

export function getPrimaryPrefix(): string {
  return getCommandPrefixes()[0] || DEFAULT_PREFIX;
}

export function resolveCommandPrefix(text: string): string | null {
  const prefixes = getCommandPrefixes().sort((a, b) => b.length - a.length);
  return prefixes.find((prefix) => text.startsWith(prefix)) || null;
}

export function parseCommandText(text: string): ParsedCommand | null {
  const prefix = resolveCommandPrefix(text);
  if (!prefix) {
    return null;
  }

  const raw = text.slice(prefix.length).trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return {
    prefix,
    raw,
    name: parts[0],
    args: parts.slice(1),
  };
}

class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private commands: Map<string, RegisteredCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private client: TelegramClient | null = null;
  private pluginsDir: string;

  constructor() {
    this.pluginsDir = process.env.PLUGINS_DIR || join(process.cwd(), "plugins");
    this.loadAliases();
  }

  setClient(client: TelegramClient): void {
    this.client = client;
  }

  private loadAliases(): void {
    this.aliases.clear();
    const aliases = db.getAllAliases();
    for (const [alias, command] of Object.entries(aliases)) {
      this.aliases.set(normalizeCommandName(alias), command);
    }
  }

  private resolveStoredAlias(alias: string): string | null {
    const normalized = normalizeCommandName(alias);
    const aliases = db.getAllAliases();

    for (const key of Object.keys(aliases)) {
      if (normalizeCommandName(key) === normalized) {
        return key;
      }
    }

    return null;
  }

  private getLoadedPluginEntry(name: string): [string, LoadedPlugin] | null {
    const normalized = normalizeCommandName(name);

    for (const [pluginName, loaded] of this.plugins.entries()) {
      if (normalizeCommandName(pluginName) === normalized) {
        return [pluginName, loaded];
      }
    }

    return null;
  }

  private registerCommand(
    pluginName: string,
    commandName: string,
    def: CommandDefinition,
    source: "commands" | "cmdHandlers",
    aliasOf?: string
  ): void {
    const normalized = normalizeCommandName(commandName);
    if (!normalized) {
      return;
    }

    const existing = this.commands.get(normalized);
    if (existing) {
      logger.warn(
        `命令冲突: "${commandName}" 已由插件 ${existing.plugin} 注册，现由插件 ${pluginName} 覆盖`
      );
    }

    this.commands.set(normalized, {
      plugin: pluginName,
      def,
      name: commandName,
      aliasOf,
      source,
    });
  }

  private registerPluginCommands(plugin: Plugin): void {
    const pluginName = plugin.name?.trim();
    if (!pluginName) {
      return;
    }

    if (plugin.commands) {
      for (const [cmd, def] of Object.entries(plugin.commands)) {
        this.registerCommand(pluginName, cmd, def, "commands");

        for (const alias of def.aliases || []) {
          this.registerCommand(pluginName, alias, def, "commands", cmd);
        }
      }
    }

    if (plugin.cmdHandlers) {
      for (const [cmd, handler] of Object.entries(plugin.cmdHandlers)) {
        this.registerCommand(
          pluginName,
          cmd,
          {
            description: `${cmd} command`,
            handler: async (msg) => {
              await handler(msg);
            },
          },
          "cmdHandlers"
        );
      }
    }
  }

  async loadBuiltinPlugins(): Promise<void> {
    const builtinDir = join(process.cwd(), "src", "plugins");
    const files = getPluginFiles(builtinDir);

    for (const file of files) {
      try {
        const pluginPath = join(builtinDir, file);
        const module = await importModule(pluginPath);   // 首次加载用普通 import（利用缓存）

        if (module.default) {
          const plugin: Plugin = module.default;
          await this.registerPlugin(plugin, pluginPath, false);
        }
      } catch (err) {
        logger.error(`加载内置插件失败 ${file}:`, err);
      }
    }

    const builtinCount = Array.from(this.plugins.values()).filter(
      (plugin) => plugin.isBuiltin
    ).length;
    logger.info(`已加载 ${builtinCount} 个内置插件`);
  }

  async loadExternalPlugins(): Promise<void> {
    const files = getPluginFiles(this.pluginsDir);
    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      try {
        const pluginPath = join(this.pluginsDir, file);
        const module = await importModule(pluginPath);   // 首次加载用普通 import（利用缓存）

        if (module.default) {
          const plugin: Plugin = module.default;
          const fileName = file.replace(/\.(ts|js)$/i, "");

          if (db.isPluginEnabled(plugin.name) || db.isPluginEnabled(fileName)) {
            await this.registerPlugin(plugin, pluginPath, true);
          }
        }
      } catch (err) {
        logger.error(`加载外部插件失败 ${file}:`, err);
      }
    }

    logger.info(`已加载外部插件`);
  }

  async registerPlugin(plugin: Plugin, path: string, isExternal: boolean): Promise<void> {
    const name = plugin.name?.trim();
    if (!name) {
      throw new Error(`插件 ${path} 缺少有效的 name`);
    }
    
    // 如果插件已存在，先卸载
    const existingPlugin = this.getLoadedPluginEntry(name);
    if (existingPlugin) {
      await this.unregisterPlugin(existingPlugin[0]);
    }

    // 初始化插件
    if (plugin.onInit && this.client) {
      await plugin.onInit(this.client);
    }

    this.registerPluginCommands(plugin);

    this.plugins.set(name, { instance: plugin, path, isBuiltin: !isExternal });
    
    if (isExternal) {
      db.savePlugin(name, plugin.version || "1.0.0");
    }

    logger.info(`插件已注册: ${name} v${plugin.version || "1.0.0"}`);
  }

  async unregisterPlugin(name: string): Promise<void> {
    const loadedEntry = this.getLoadedPluginEntry(name);
    if (!loadedEntry) return;

    const [pluginName, loaded] = loadedEntry;
    if (!loaded) return;

    // 卸载钩子
    if (loaded.instance.onUnload) {
      try {
        await loaded.instance.onUnload();
      } catch (err) {
        logger.error(`插件卸载钩子失败 ${pluginName}:`, err);
      }
    }

    for (const [commandName, command] of this.commands.entries()) {
      if (command.plugin === pluginName) {
        this.commands.delete(commandName);
      }
    }

    this.plugins.delete(pluginName);
    logger.info(`插件已卸载: ${pluginName}`);
  }

  getCommand(name: string): { plugin: string; def: CommandDefinition } | undefined {
    const normalized = normalizeCommandName(name);
    const aliased = this.aliases.get(normalized);

    const targetName = aliased || name;
    const command = this.commands.get(normalizeCommandName(targetName));
    if (!command) {
      return undefined;
    }

    return { plugin: command.plugin, def: command.def };
  }

  getAllCommands(): Record<string, CommandDefinition> {
    const result: Record<string, CommandDefinition> = {};
    for (const { name, def, aliasOf } of this.commands.values()) {
      if (!aliasOf && !result[name]) {
        result[name] = def;
      }
    }
    return result;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.getLoadedPluginEntry(name)?.[1].instance;
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).map(p => p.instance);
  }

  isCmdHandlerCommand(cmdName: string): boolean {
    const cmdInfo = this.commands.get(normalizeCommandName(cmdName));
    return cmdInfo?.source === "cmdHandlers";
  }

  getPluginCommands(pluginName: string): { commands: string[]; cmdHandlers: string[] } {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) return { commands: [], cmdHandlers: [] };
    
    return {
      commands: plugin.commands ? Object.keys(plugin.commands) : [],
      cmdHandlers: plugin.cmdHandlers ? Object.keys(plugin.cmdHandlers) : [],
    };
  }

  async handleMessage(msg: Api.Message): Promise<void> {
    if (!this.client) return;
    if (!msg) return;

    // 并行执行所有插件的 onMessage（Promise.allSettled 不会因单个失败而中断其他插件）
    const client = this.client;
    await Promise.allSettled(
      Array.from(this.plugins.values())
        .filter(({ instance }) => typeof instance.onMessage === "function")
        .map(({ instance }) =>
          instance.onMessage!(msg, client).catch((err) => {
            logger.error(`插件消息处理错误 ${instance.name}:`, err);
          })
        )
    );
  }

  setAlias(alias: string, command: string): void {
    const storedAlias = this.resolveStoredAlias(alias);
    if (storedAlias && storedAlias !== alias) {
      db.removeAlias(storedAlias);
    }

    this.aliases.set(normalizeCommandName(alias), command);
    db.setAlias(alias, command);
  }

  removeAlias(alias: string): void {
    this.aliases.delete(normalizeCommandName(alias));
    db.removeAlias(this.resolveStoredAlias(alias) || alias);
  }

  getAliases(): Record<string, string> {
    return db.getAllAliases();
  }

  async reloadPlugin(name: string): Promise<boolean> {
    const loadedEntry = this.getLoadedPluginEntry(name);
    if (!loadedEntry) return false;

    const [pluginName, loaded] = loadedEntry;

    await this.unregisterPlugin(pluginName);
    
    try {
      const module = await importFreshModule(loaded.path);
      if (module.default) {
        await this.registerPlugin(module.default, loaded.path, !loaded.isBuiltin);
        return true;
      }
    } catch (err) {
      logger.error(`重载插件失败 ${pluginName}:`, err);
    }
    return false;
  }

  async reloadAll(): Promise<void> {
    const names = Array.from(this.plugins.keys());
    for (const name of names) {
      await this.reloadPlugin(name);
    }
  }
}

export const pluginManager = new PluginManager();

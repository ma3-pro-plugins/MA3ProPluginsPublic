import archiver from 'archiver';
import chalk from 'chalk';
import fse from 'fs-extra';
import { mdToPdf } from 'md-to-pdf';
import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'path';
import TemplateFile from 'template-file';

const LATEST_MA_VERSION = "1.8"

// Chalk Initialization
const error = chalk.bold.bgRed;
const warning = chalk.hex('#FFA500'); // Orange color
const info = chalk.bgWhite
const log = {
    debug: (...args) => console.log('DEBUG:', ...args),
    warn: (...args) => console.log(warning('WARN:'), ...args),
    info: (...args) => console.log(info('INFO:'), ...args),
    error: (...args) => console.log(error('ERROR:'), ...args),
    configError: (...args) => console.log(error('ConfigError:'), ...args)
}

const MA_USB_PLUGINS_PATH = `grandMA3/gma3_library/datapools/plugins/`
// TODO: Take this from an environment variable
const maInstallationPath = "/Users/erez/MALightingTechnology/"
const maPluginsInstallPath = path.join(maInstallationPath, "gma3_library/datapools/plugins/")

// Parse Params
function parseScriptArguments() {
    return {
        pluginFolderPath: process.argv[2] + '/',
        buildEnv: process.argv[3],
        maTargetVersion: process.argv[4] || LATEST_MA_VERSION
    }
}

const scriptArgs = parseScriptArguments()
const buildScriptsPath = path.join(scriptArgs.pluginFolderPath, "../../build_scripts")
function isDev() { return scriptArgs.buildEnv === 'dev' }
const repoRoot = `${scriptArgs.pluginFolderPath}../../`

// Read package.json abd build.json tsconfig.json
const packageJson = JSON.parse(fs.readFileSync(`${scriptArgs.pluginFolderPath}package.json`).toString())
const maconfigJson = JSON.parse(fs.readFileSync(`${scriptArgs.pluginFolderPath}maconfig.json`).toString())

function getTranspiledFileName(fileName) {
    return path.basename(fileName, path.extname(fileName)) + '.lua'
}

function generateTSConfig(entryPath, config, entryConfig) {
    /**
     * sourceMapTraceback is disabled since the line numbers are wrong
     */
    const tsconfigContent = `{
        "extends": "${config.relativePathToRoot}tsconfig",
        "include": ["${config.relativePathToRoot}node_modules/grandma3-types/index.d.ts", "${config.relativePathToRoot}lib/types/index.d.ts", "src/**/*"],
        "tstl": {
          "luaTarget": "5.3",
          "luaBundleEntry": "${entryPath}",
          "luaBundle": "${entryConfig.targetBundlePath}",
          "luaPlugins": [
            { "name": "${config.relativePathToRoot}tstl/grandMA3-tstl-plugin.js" }
          ],
          "sourceMapTraceback": true,
          "noResolvePaths": ["json", "lfs"]
        }
      }
    `
    const tsconfigFilePath = path.join(config.pluginFolderPath, config.isDev() ? 'tsconfig_dev.json' : 'tsconfig.json')
    fs.writeFileSync(tsconfigFilePath, tsconfigContent, { encoding: `utf8` })
    log.debug(`Written ${tsconfigFilePath}`)
}


function transpileEntryPoint(fileName, config) {
    // const { targetBundlePath } = createEntryConfig(fileName, config)
    // log.info("targetBundlePath: " + targetBundlePath)
    runTstl("tsconfig.json")
    // return tstl.transpileProject("tsconfig.json", {
    //     luaTarget: "5.3",
    //     luaBundleEntry: `./src/${fileName}`,
    //     luaBundle: targetBundlePath,
    // });
}

function transpile(config) {
    for (const comp of maconfigJson.components) {
        switch (comp.type) {
            case "ts":
                log.info("Transpile")
                transpileEntryPoint(comp.fileName, config)
                // const result = transpileEntryPoint(comp.fileName, config)
                // for (const d of result.diagnostics) {
                //     log.info(d.messageText)
                // }
                // log.info("emitResult: " + result.emitResult);
                break
        }

    }
}


function generateXml(config) {
    const { maTargetVersion } = config
    const pluginVersion = config.pluginVersion
    const pluginLabel = config.isDev() ? "DEV " + maconfigJson.maPluginName : maconfigJson.maPluginName
    const installedAttr = scriptArgs.buildEnv === 'dev' ? 'Installed="Yes"' : ''
    const xmlFileName = (config.isDev() ? `DEV ${maTargetVersion} - ` : "") + `${config.fullPluginName}.xml`

    function createComponents(componentsData) {
        let s = ""
        for (const comp of componentsData) {
            const fileName = comp.type === 'ts' ? getTranspiledFileName(comp.fileName) : comp.fileName
            s += `        <ComponentLua FileName="${fileName}" ${installedAttr} />\n`
        }
        return s
    }

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<GMA3 DataVersion="${maconfigJson.maVersion}">
<${maTargetVersion === "1.8" ? 'UserPlugin' : 'Plugin'} Name="${pluginLabel} v${pluginVersion.replaceAll(".", "_")}" Version="${pluginVersion}" Author="${config.author || ""}" path="${config.maPluginPath}">
${createComponents(maconfigJson.components)}
</${maTargetVersion === "1.8" ? 'UserPlugin' : 'Plugin'}>
</GMA3>
`

    fs.mkdirSync(config.targetPluginPath, { recursive: true })
    const xmlFilePath = path.join(config.targetPluginPath, xmlFileName)
    fs.writeFileSync(xmlFilePath, xmlContent, { encoding: `utf8` })
    log.debug(`Created ${xmlFilePath}`)
}

function generateEnvFile(config, env) {
    const pluginId = `${maconfigJson.organizationId}__${maconfigJson.pluginId}__v${maconfigJson.pluginVersion.replace(/\./g, "_")}`
    const fileContent = `// This file is GENERATED by buildPlugin.mjs script
import {PluginEnv} from "lib/plugin/PluginEnv"
export const PLUGIN_ENV = new PluginEnv({
    env: "${env}",
    pluginName: "${config.pluginName}",
    pluginId: "${`${pluginId}${env === 'dev' ? "_dev" : ""}`}",
    pluginVersion: "${maconfigJson.pluginVersion}",
    author: "${config.author}"
})
`
    const filePath = path.join(config.srcPath, "__env.ts")
    fs.writeFileSync(filePath, fileContent, { encoding: `utf8` })
    log.info(`Created ${filePath}`)
}

function copyAssets(config) {
    for (const comp of maconfigJson.components) {
        switch (comp.type) {
            case "lua":
                fs.copyFileSync(`./src/${comp.fileName}`, path.join(config.targetPluginPath, comp.fileName))
                break
        }

    }
}
function runTstl(tsconfig) {
    execSync(`tstl -p ${tsconfig}`, { stdio: 'inherit' })
}

async function runTstlWatch(tsconfig) {
    return new Promise(resolve => {

        const props = ["-p", tsconfig, "--watch"]

        const proc = spawn("tstl", props)
        proc.stdout.on('data', (data) => {
            log.info(data.toString());
        });
        proc.on('error', err => {
            console.error(`error: ${err}`);
        })

        proc.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                log.info(`tstl child process exited with code ${code}`);
            }
            resolve()
        });
    })
}

function getTSComponent() {
    for (const comp of maconfigJson.components) {
        if (comp.type === 'ts') {
            return comp
        }
    }
}

function createEntryConfig(fileName, config) {
    const maPluginPath = config.maPluginPath
    const targetFileName = getTranspiledFileName(fileName)

    return {
        targetFileName,
        targetBundlePath: path.join(config.pluginsPath, maPluginPath, targetFileName)

    }
}

function createFSName(...parts) {
    return parts.join(" - ")
}

function createBaseConfig(scriptArgs) {
    function assertThrow(condition, msg) {
        if (!condition) {
            log.configError(msg)
            process.exit()
        }
    }
    const { maPluginName, pluginVersion } = maconfigJson
    assertThrow(pluginVersion, "macofig.json missing 'pluginVersion' property")
    const versionSuffix = `v${maconfigJson.pluginVersion}`
    const author = maconfigJson.author
    const authorX = author.replace(" ", "")
    const pluginFolderNameWithVersion = isDev() ? `${maPluginName}` : createFSName(maPluginName, versionSuffix)
    const pluginFSNameWithAuthorAndVersion = createFSName(author, maPluginName, versionSuffix)
    const distRoot = path.join(process.cwd(), `../../`, "dist")
    const distPath = path.join(distRoot, pluginFSNameWithAuthorAndVersion)

    return {
        author,
        authorX,
        distRoot,
        distPath,
        isDev,
        maPluginsInstallPath,
        pluginVersion,
        pluginsPath: isDev() ?
            path.join(maPluginsInstallPath) :
            path.join(distPath, MA_USB_PLUGINS_PATH),
        pluginFolderPath: scriptArgs.pluginFolderPath,
        pluginFolderNameWithVersion,
        pluginFSNameWithAuthorAndVersion,
        pluginName: maPluginName,
        relativePathToRoot: `../../`,
        srcPath: './src/',
        versionSuffix,
    }
}

function createConfig(baseConfig, maTargetVersion) {
    const {
        author,
        distPath,
        maPluginsInstallPath,
        pluginsPath,
        pluginFolderNameWithVersion,
        pluginName,
        versionSuffix
    } = baseConfig

    const maPluginPathFirstPart = isDev() ? author + ' DEV' : `${author}`
    const maPluginPath = path.join(maPluginPathFirstPart, pluginFolderNameWithVersion, `MA3 ${maTargetVersion}`)
    const fullPluginName = isDev() ? `${pluginName} DEV` : `MA3 ${maTargetVersion} - ${author} - ${pluginName} - ${versionSuffix}`

    return {
        ...baseConfig,
        fullPluginName,
        targetPluginPath: path.join(pluginsPath, maPluginPath),
        maTargetVersion,
        maPluginPath,
        maPluginPathFirstPart,
    }
}

async function createMultiVersionZip(baseConfig) {

    const {
        distRoot,
        distPath,
        pluginFSNameWithAuthorAndVersion
    } = baseConfig

    return new Promise(async (resolve, reject) => {

        process.chdir(distPath)
        // for (let maTargetVersion of ["1.6", "1.8"]) {
        //     const zipFilePath = path.join(maTargetVersion, createZipFileName(pluginFolderNameWithVersion, maTargetVersion))
        //     execSync(`mv "${zipFilePath}" .`)
        // }

        const targetVersions = ["1.6", "1.8"]
        const zipFolderNames = targetVersions.map(targetVersion => {
            const config = createConfig(baseConfig, targetVersion)
            return config.maPluginPathFirstPart

        })
        // const zipFileNames = targetVersions.map(maTargetVersion => `${createZipFileName(pluginFolderNameWithVersion, maTargetVersion)}`)
        const zipSourcesAsCmdArgs = zipFolderNames.map(fileName => `"${fileName}"`).join(" ")


        const readMeMarkdownFileName = "./README.md"
        fs.writeFileSync(readMeMarkdownFileName, await createReadMeContent(baseConfig, targetVersions), { encoding: `utf8` })

        const pdf = await mdToPdf({ path: readMeMarkdownFileName }).catch(console.error);

        const readMePdfFileName = "README.pdf"
        if (pdf) {
            fs.writeFileSync(readMePdfFileName, pdf.content);
            fse.unlinkSync(readMeMarkdownFileName)
        }

        // ARCHIVE
        log.info("ARCHIVE START")
        // execSync(`tar czf "${multiVersionZipFileName}" ${zipSourcesAsCmdArgs} "${readMePdfFileName}"`)
        const multiVersionZipFileName = `${pluginFSNameWithAuthorAndVersion}.zip`
        const output = fs.createWriteStream(path.join(distRoot, multiVersionZipFileName));
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        output.on('close', function () {
            log.info(archive.pointer() + ' total bytes');
            log.info('archiver has been finalized and the output file descriptor has closed.');
            resolve()
        });

        output.on('end', function () {
            log.info('Data has been drained');
        });

        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                log.warn(err)
            } else {
                reject(err);
            }
        });

        archive.on('error', function (err) {
            reject(err);
        });

        archive.pipe(output);

        // archive.file(path.join(process.cwd(), readMePdfFileName), { name: 'README.pdf' })
        archive.directory(distPath, path.basename(distPath))
        archive.finalize();

        // Back to original path
        process.chdir(scriptArgs.pluginFolderPath)
    })
}


async function createReadMeContent(baseConfig) {
    const {
        author,
        pluginName,
        versionSuffix
    } = baseConfig

    const renderedString = await TemplateFile.renderFile(
        path.join(buildScriptsPath, './README.template.md'),
        {
            author,
            pluginName,
            versionSuffix
        });

    return renderedString
}

function installPlugin(config) {
    try {
        const srcDir = path.join(config.pluginsPath, config.maPluginPathFirstPart)
        const destDir = path.join(maPluginsInstallPath, config.maPluginPathFirstPart)
        fse.mkdirpSync(destDir)
        fse.removeSync(path.join(destDir, config.pluginFolderNameWithVersion))
        console.log(`installPlugin: srcDir=${srcDir}`)
        // This copy merges directory contents with existing directories. If a file exists it overwrites it.
        fse.copySync(srcDir, destDir, { overwrite: true, errorOnExist: false, recursive: true })
        console.log(`Installed to  ${destDir}`)
    } catch (err) {
        console.error(err)
    }
}

function convertImagesToBase64(config) {
    const sourceFolder = "./src/images/"
    if (!fs.existsSync(sourceFolder)) {
        return
    }

    const targetFolder = path.join("./src/", "__imagesB64/")
    fs.mkdirSync(targetFolder, { recursive: true })

    const ignorePattern = /$\..*/g
    const files = fs.readdirSync(sourceFolder).filter(fileName => !fileName.startsWith("."))
    console.log(files)
    function toTSFileName(fileName) {
        const fileNameOnly = path.basename(fileName, ".png")
        return `__${fileNameOnly}.ts`
    }

    files.forEach((fileName) => {
        if (path.extname(fileName) === ".png") {
            const data = fs.readFileSync(path.join(sourceFolder, fileName))
            const targetPath = path.join(targetFolder, toTSFileName(fileName))
            const content = `export const fileName = "${fileName}"\nexport const imageBase64 = "${data.toString('base64')}"`
            fs.writeFileSync(targetPath, content, { encoding: `utf8` })
        } else {
            log.error(`Non .png image files are not supported yet. Remove ${fileName} from ./src/images/`)
            process.exit()
        }
    })

    function fileKey(fileName) {
        return path.basename(fileName, ".png").replace(" ", "_")
    }
    const importStatements = files.map(fileName => {
        const variableName = fileKey(fileName)
        return `import {  imageBase64 as ${variableName}} from "./${path.basename(toTSFileName(fileName), ".ts")}"`
    }).join("\n")

    const filesProps = files.map(fileName => {
        const variableName = fileKey(fileName)
        return `${variableName}: { fileName: "${fileName}", imageBase64: ${variableName} }`
    }).join(",\n\t")

    const fileKeys = files.map(fileName => `"${fileKey(fileName)}"`).join(" |\n\t")
    const content = `${importStatements}\n
export type ImageKey = ${fileKeys}

export const images: {[key in ImageKey]: {fileName: string, imageBase64: string}} = {
    ${filesProps}
}`
    const indexPath = path.join(targetFolder, "index.ts")
    fs.writeFileSync(indexPath, content, { encoding: `utf8` })

}

async function build() {
    const baseConfig = createBaseConfig(scriptArgs)
    if (isDev()) {
        log.info(`Starting DEV build for maVersion ${scriptArgs.maTargetVersion}`)
        const config = createConfig(baseConfig, scriptArgs.maTargetVersion)
        log.info("buildPlugin: DEV")
        let numOfTSComponents = 0
        for (const comp of maconfigJson.components) {
            if (comp.type === 'ts') {
                numOfTSComponents++
            }
        }
        if (numOfTSComponents > 1) {
            throw Error("Only 1 TS component is supported")
        }
        convertImagesToBase64(config)
        const comp = getTSComponent()
        if (comp != undefined) {
            const entryConfig = createEntryConfig(comp.fileName, config)
            generateTSConfig(`./src/${comp.fileName}`, config, entryConfig)
        }
        generateXml(config)
        copyAssets(config)
        if (comp != undefined) {
            generateEnvFile(config, 'dev')
            return runTstlWatch("tsconfig_dev.json", true)
        }
    } else {
        log.info("buildPlugin: PROD")
        fse.removeSync(baseConfig.distPath)
        const maTargetVersions = ["1.6", "1.8"]
        for (let maTargetVersion of maTargetVersions) {
            const config = createConfig(baseConfig, maTargetVersion)
            const comp = getTSComponent()
            generateEnvFile(config, 'prod')
            convertImagesToBase64()
            if (comp != undefined) {
                const entryConfig = createEntryConfig(comp.fileName, config)
                generateTSConfig(`./src/${comp.fileName}`, config, entryConfig)
                // transpile(config)
                runTstl("tsconfig.json")
            }
            generateXml(config)
            copyAssets(config)
            // createZip(config, maTargetVersion)
        }

        // Create Plugin MultiVersion Zip
        log.info("Create MultiVersion Zip File")
        await createMultiVersionZip(baseConfig)

        // Install (Copy plugin to .../gma3_library/datapools/plugins/)
        for (let maTargetVersion of maTargetVersions) {
            const config = createConfig(baseConfig, maTargetVersion)
            installPlugin(config)
        }
        log.info("buildPlugin: PROD: DONE")
    }
}



(async () => {
    try {
        await build()
        process.exit(0);
    } catch (error) {
        log.error(error)
        process.exit(1);
    }
})();
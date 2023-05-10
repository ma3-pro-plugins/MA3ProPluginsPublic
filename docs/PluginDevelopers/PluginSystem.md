# How LUA Plugins Work in MA3

## Plugin System

### Startup 

When MA3 starts, it loads the plugins according to their order in the Plugin Pool, e.g. :

`Plugin 1` will be loaded before `Plugin 2`.

This is good to know if your plugins declare global variables, or relay on the existance of global variables.

### ReloadAllPlugins Command

Running the "ReloadAllPlugins" command:

- Reloades only plugins that are checked as "Installed = Yes" and their files were CHANGED since the last relaod.
  - Does NOT reset global variables
  - Does NOT reset object hooks

### ReloadUI Command

Running the "ReloadUI" command:

- Reloades the whole LUA engine, as if the system was restarted.
  - Resets global variables
  - Resets object hooks

### Load Show

**When you load a new show, the LUA engine does NOT restarted !**

There is currently no onShowLoad event.
- global variables: **PERSIST**
- object hooks: **RESET**

## Individual Plugin

### Plugin Components (aka. ComponentLua, Plugin Line)

- Each Plugin can have multiple Components
- Each Component has a Number and a Name and some lua code
- A component can be either "InStream" or "Installed"
  - InStream: the lua code is stored in the show file only.
  - Installed: the lua code is loaded from a file

### Plugin return functions

A plugin component can return 3 functions:

```
 return Main,Cleanup,Execute
```

- Main - is called when the plugin object is clicked
-  Cleanup - is called right after Main
-  Execute - is called if the plugin is assigned to an executor. It has not access to the Object-API, only pure lua


### Plugin Loading

When a plugin is loaded:

- When a component is loaded, all it's declaration and assignment run, but no actual function is called.

- The plugins' components are loaded in ascending order (by their Number)

### Running Plugins 

You can run a plugin by issuing a command: (In the command line)

`Plugin [number | name]`

For example to run plugin number 10:

`Plugin 10`

This is the same as clicking on the Plugin object in the Plugin Pool.

This will default to runninf the first component, and is equivilant of doing:

`Plugin 10.1`

You can run other components by their number or name, e.g. :

`Plugin 10.3` 
`Plugin MyPlugin.MySecondComp`

"Running A Component" means calling it's `main` function.

If the component doesn't return any function, then you will get an error.


## MA Script Arguments

Explain these:
local pluginName     = select(1,...);
local componentName  = select(2,...); 
local signalTable    = select(3,...);
local my_handle      = select(4,...); -- This is the component's handle

- pluginName: is the plugin name which is the plugin's object name int the Plugins pool. Note that it can be change by the user, and your LUA code will NOT be aware of it !

- componentName: is the plugin's component's name. A plan may have several component, each having an index and name. When you click a plugin object in the plugins pool, it always runs the first component. You can run other components directly using the "Plugin" command, e.g. "Plugin 3.1" runs component 3 of plugin with index 1.

- signalTable: I don't know yet, but I guess it is some kind of object that you can put event listeners on, and listen to system events. I see it in use in the built in menus.

- my_handle: This is the plugin's object handle (UserData). you need this when you register hooks.

## Plugin Import / Export


### Plugin Location


### Import

To import a plugin:
-  edit an empty plugin slot (in the Plugin Pool)
-  click "Import"
-  select the drive from which you want to import (e.g "Internal" or a connected USB-Drive).
-  Select a plugin from the list
-  click Import

#### Plugin Files Locations

Each plugin on the plugin list corresponds to a single `Plugin Name.xml` file. The list us built by collecting all XML files in the following folder (And of their sub-folders)

Internal Drive (On Mac)
`/Users/[user]/MALightingTechnology/gma3_1.8.1/shared/resource/lib_plugins`
`/Users/[user]/MALightingTechnology/gma3_library/datapools/plugins`

On a USB Drive:
`[Drive]/grandMA3/gma3_library/datapools/plugins`

`/Users/[user]/MALightingTechnology/gma3_1.8.1/shared/resource/lib_plugins

### Export

When you export a plugin, it is creates a [plugin name].xml file:

`/Users/[user]/MALightingTechnology/gma3_library/datapools/plugins` + [Path in the plugin's settings]

- You should uncheck "Installed" if you are exporting to external drive (USB) and you want to load thi plugin on another system. This way, also the lua script will be exported (not only the xml)


## Plugin Persistent Storage

A plugin may store variables for persistent storage in 2 placed:
1) Along with ShowData , using the `AddonVars()` function
2) Along with UserProfile , using the `PluginVars()` function
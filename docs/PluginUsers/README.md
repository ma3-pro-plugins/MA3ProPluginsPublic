# All You Need To Know About MA3 Plugins

## How to Import a Plugin

1. [Prepare The Plugin Source](#prepare-the-plugin-source)

1. [Import The Plugin](#import-the-plugin)

### Prepare The Plugin Source

> This step is done on your computer (not on the console)

- [With a USB-Drive](#with-usb-drive)
- [Without a USB-Drive (onPC only)](#without-usb-drive)

<h4 id="with-usb-drive">
With a USB-Drive
</h4>

This works for both onPC and Console.
Prepare a USB-Drive with the following folder at it's root:

`[Drive]/grandMA3/gma3_library/datapools/plugins`

Usually when you download a plugin zip file, it will include this folder structure:

```
grandMA3/
  gma3_library/
    datapools/
      plugins/
        [Plugin Name].xml
        [Plugin Name].lua
```
So you just need to extract this zip file to the root of a USB-Drive.

>NOTE: The plugin may require more resouces (maybe images), so thay will be included in the correct path, you don't need to bother with those`

<h4 id="without-usb-drive">
 Without USB-Drive (onPC)
</h4>

This is just for onPC. If you don't have a USB-Drive with you, or any other reason.


##### From zip file

Assuming the extracted zip file content looks like this:
```
grandMA3/
  gma3_library/
    datapools/
      plugins/
        [Plugin Name].xml
        [Plugin Name].lua
```

Then take the `gma3_library` and copy it's content to:

On Mac:
`/Users/[user]/MALightingTechnology/gma3_library/`

On Windows:
`C:/ProgramData/MALightingTechnology/gma3_library/`

Assuming that the plugin's file names are unique, you won't have any name colisions.

##### Individual Files

If you have just downloaded 2 files :
```
[Plugin Name].xml
[Plugin Name].lua
```

Simply copy/move them to this folder (Or any of it's sub-folders for better organization):

On Mac:
`/Users/[user]/MALightingTechnology/gma3_library/datapools/plugins/`

On Windows:
`C:/ProgramData/MALightingTechnology/gma3_library/datapools/plugins/`


### Import The Plugin 
> This step is dnoe in MA3 onPC app, or on the console.

To import a plugin:

-  Edit an empty plugin slot (in the Plugin Pool)
-  Click "Import"
-  Select the drive from which you want to import (e.g "Internal" or a connected USB-Drive).
-  Select a plugin from the list
-  Click Import

## How to "copy" a plugin to another showfile

Sometimes, you import a plugin from a USB-Drive to one show file, and then at some point you wanty to use it in a different show file, but you don't have the plugin installation USB-Drive with you.

TODO...
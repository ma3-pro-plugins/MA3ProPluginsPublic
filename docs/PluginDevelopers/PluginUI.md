# Plugin UI

## Built-In UI Function

- PopupInput
- MessageBox

## Custom UI

This can be done be instantiating display overlay items with LUA.

TBD

## MessageBox()

Formated version from [MA3 user manual 1.8](https://help2.malighting.com/Page/grandMA3/lua_function_list/en/1.8)

Also see [this post](https://forum.malighting.com/forum/thread/4087-messagebox/) for more info: 

```lua
MessageBox(
    {
        title:string,
        [backColor:string,]
        [timeout:number,] -- (ms)
        [timeoutResultCancel:boolean,]
        [timeoutResultID:number,]
        [icon:string,]
        [titleTextColor:string,]
        [messageTextColor:string,]
        message:string,
        [display:(integer|lightuserdata)],
        commands: {
            array of {
                value:integer,
                name:string
            }
        },
        inputs: {
            array of InputItem {
                    name:string,
                    value:string,
                    blackFilter:string, 
                    whiteFilter:string,
                    vkPlugin:string,
                    maxTextLength:integer
            }
        },
        states: {
            array of StateItem {
                name:string, 
                state:boolean
                [,group:integer]
            }
        },
        selectors: {
            array of SelectorItem {
                    name:string,
                    selectedValue:integer,
                    values:table
                    [,type:integer 0-swipe, 1-radio]
                } 
        }
)
    : -- Return value
    {
        success:boolean, -- true if a command was clicked, false if the MessageBox was closed by Esc
        result:integer, -- The selected command value
        inputs:{array of [name:string] = value:string}, -- key is the name prop from the inputs InputItem items
        states:{array of [name:string] = state:boolean}, -- key is the name prop from the states StateItem items
        selectors:{array of [name:string] = selectedValue:integer} -- key is the name prop from the selectors SelectorItem items
    }
```
---
title: "Maps"
icon: "image-landscape"
weight: 200
wiki_group: "College Debt SMP"
nested: true
---

The image2map command allows you to import any web images into the world in form of map(s)

## Importing custom maps

{{< hint "warning" >}}
When not use carefully, you can generate an absurd amount of maps that will take a lot of map ids and lag the server. By default, map size is based on the original dimension of the image and should always be resize. Created maps cannot be directly edited nor automatically removed. Previewing the image before creation is highly recommended.
{{< /hint >}}

Before making your image, make sure you have enough empty maps in your inventory corresponding to how big your map will be.

To begin, do `/image2map preview URL` where URL is the web URL to the image. If the game successfully grab your image, you will momentarily be brought out of the ground into the preview screen.

To adjust your image, you can use the following command while in preview:

* `/normalize <WIDTH>` - Resize the image to the specified width in Minecraft blocks ranging from 1 to 8 while maintaining the original aspect ratio. In most cases, this is the recommended method of resizing your image
* `/size <WIDTH> <HEIGHT>` - Resize the image to the specified width and height in pixels. Each Minecraft map is 128x128 in size. Aspect ratio are not automatically maintain and are stretched to fit the specified size.
* `/dither <[floyd/none]>` - Changes dither mode. You can choose either the [Floyd–Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) or none
* `/size` - Displays current dimension of the map
* `/grid` - Toggles visibility of map grid. The grid corresponds to one block

If you're done, do `/save` to exit the preview and receive your map(s). Otherwise, you can exit without saving with `/exit.`

### Where to upload local images

You can use [Filebin](https://filebin.net/), a private Discord text channel, or to any cloud storage provider you have access to. If you're having issues trying to pull an online image, you can also try to upload it like a local image.

### Direct create mode

You can create the map straight away using one line of command. However, this method is unsupported, and you should always preview the image first unless you’re sure what the map will look like. The command is formatted as follows:

`/image2map create <WIDTH> <HEIGHT> <[dither/none]> URL`

Not specifying the image width and height will default to its original dimension.

## Removing excess item frame border

You will frequently ran into a situation where your map(s) doesn't completely cover all of the item frames and exposes its leathery background. You can use invisible item frames instead.

## Making duplicates

You can clone custom maps via crafting or the Cartography Table like any other maps. Unless if you lost all or a portion of an image to make copies of, avoid using the image2map command to make existing duplicate.

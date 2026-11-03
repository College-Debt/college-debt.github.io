---
title: "Custom Musics & Sounds"
icon: "compact-disc"
cover: "/assets/wiki/2024-03-13_19.04.24.png"
weight: 150
wiki_group: "College Debt SMP"
nested: true
---

{{< hint "info" >}}
This feature requires the use of the Simple Voice Chat mod
{{< /hint >}}

The `audioplayer` command allows you to upload any audio file onto a Music Disc or a Goat Horn. To hear the custom audio, proximity voice chat must be enabled/undeafened (the default key bind to toggle this is `N`). Unlike in-game music discs, parrots and allays do not dance when playing a custom audio.

<figure><img src="/assets/wiki/Screenshot 2024-03-12 014517.png" alt=""><figcaption></figcaption></figure>

### Importing custom audio

Before we touch the command, the server only supports uploading audios with the following criteria:

* File extension ending in either .mp3 or .wav. Videos including those from YouTube must first be converted to audio in those format, and there are sites that can do this for you
* At most 20 minutes long or 100 MB in file size. This limit can be increase by the server admin

To upload, you must either have the audio file on your system or have a web URL that _directly_ link to the audio file.

* Pull from URL: Run `/audioplayer url "https://example.com/myaudio.mp3"` where `https://example.com/myaudio.mp3` is the link to your audio file. Note that the URL must end with the file extension&#x20;
* Pull from your system: The server can provide a web link for you to upload your file into. Run `/audioplayer filebin` and follow the instructions

{{< embed "https://www.youtube.com/watch?v=tixidvB4Zko" >}}
Adding and applying custom audio via Filebin
{% endembed %}

### Applying custom audio

If you follow the corresponding above steps, the mod will give you the option in chat to apply the custom audio. Hold either the music disc or goat horn you want to customize in your main hand before applying. You will be given a prefill command that allows you to do so.

Additionally, you can append an additional argument at the end enclosed in quotation the title to give to the music disc and horn (e.g. C418 - cat).

Every audio uploaded to the server will have an ID attached to it. You will need the ID in order to apply the same audio to another disc or horn. Run `/audioplayer id` while holding the item containing the audio to retrieve it.

### Audio ID database

Listed are the numerical ID and the associated track that are known to be already imported into the server. Use this if you want to reuse an existing audio.

List might not be up to date.

<table><thead><tr><th width="220">ID</th><th width="141">Artist</th><th>Title</th></tr></thead><tbody><tr><td>2f838ef1-90a8-4893-998d-77365de8f5ce</td><td>Technoblade</td><td>Blitz</td></tr><tr><td>b9f1f0d1-d6ad-4f62-b238-64f31b3fcfc5</td><td>HOYO-MiX</td><td>Wildfire</td></tr><tr><td>edda9e97-cad1-401a-a7e0-ddda96753441</td><td>HOYO-MiX</td><td>If I Can Stop One Heart From Breaking</td></tr></tbody></table>

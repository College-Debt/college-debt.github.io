---
title: "Update history"
description: "Current version: Java 26.2 & Bedrock 26.0–26.33"
icon: "clock"
weight: 100
wiki_group: "College Debt SMP"
---

<details>

<summary>Quality of life update – 7/31/2026</summary>

[Full post](https://collegedebt.app/updates/updates-qol/)

### Maintenance

#### Automatic update

The server was able to automatically update all of its mods for a while now, but it can now do the same for Minecraft updates. If every baseline mods for the server has been updated to the latest version, the server will bump the Minecraft version by itself on the next maintenance reboot. This will decouple the update process from Quang's own schedule to speed things up in the end.

Baseline mods consist of those that add new features to the game's world such as Dungeons and Taverns, Geophilic, and Portfolio. The remainder mods will get disabled if its not yet compatible with the latest version of the game; it will re-enable itself once updated.

#### Server configurations

As a server member, you're granted access to the server's Docker Compose file if you need to manually reboot the server or want to see how it's configured. Refer to the wiki for more information.

Unless you know what you're doing, you may not modify the compose file without prior permission. Misconfiguration can break the server.

### In-game

#### Modded structure changes

To make Minecraft more fun to explore and feel less grindy, I continue to explore on how I can modify the world without making it too bloated. For this iteration, I have decided to remove the Explorify and Hearths mod and replace them with the following:

* [Structory](https://modrinth.com/datapack/structory)
* [Formations Nether](https://modrinth.com/mod/formations-nether)

These have less overlap with existing mods like Dungeons and Taverns while adding more lore to the game. You do want your world to feel alive. You're free to suggest on what else would you like to see on the server.

#### Decorations

I've reintroduced the Portfolio mod, which adds more paintings to the game from the artist [Yapetto](https://bsky.app/profile/yptsh.bsky.social), that got accidentally removed. If you want more things to put in your house, you can [name stuff with anvils](https://modrinth.com/datapack/vanilla-plus-data-pack)!

#### Voxy LOD streaming (workaround for slow chunks)

I'm aware that the server can get quite sluggish trying to load chunks on faster speed without the risk of hitting an invisible wall. I unfortunately can't improve it without switching to either [Pumpkin MC](https://pumpkinmc.org/) (not stable) or switch to a faster server (too broke). The best remedy available is to add [level of detail](https://en.wikipedia.org/wiki/Level_of_detail_\(computer_graphics\)) (LOD) to the server. By installing [Voxy](https://modrinth.com/mod/voxy), you can see at greater rendering distance including chunks the server has not loaded yet.

As an added bonus, it allows you to see further with much less performance impact by employing the same technique seeing in modern open-world video games.

#### Bring your own paintings

You can now take any digital images you have and bring it into the server as a Minecraft painting. [The process](/wiki/college-debt-smp/features/custom-paintings/) involves creating a custom painting resource pack with those images before uploading it to the server automatically via an automated system. You can make it high definition like the original image or have it be more pixelated like the one in the game.

### A custom modpack: Together Optimized

To make the process of using mods on the server more simple, I've decided to publish a custom modpack made specifically for the College Debt SMP that has all of the modded bells and whistles seen on the server's wiki bundled in. It has:

* All of the performance and visual enhancements seen in Fabulously Optimized.
* Simple Voice Chat for proximity voice chat and custom audio.
* Vivecraft for playing in VR or seeing others playing in VR.
* Voxy (mentioned earlier) for LOD.
* Nvidium and Reflex AntiLag for better performance on Nvidia GPU.

In a nutshell, it's a fork of Fabulously Optimized with all the server multiplayer stuff sprinkled in, and I've decided to call it **Together Optimized**. You can grab the latest release from [GitHub](https://github.com/College-Debt-SMP/together-optimized/releases) or from [Modrinth](https://modrinth.com/modpack/together-optimized). Installation process is the same as any other modpack.

Using this modpack or any other similar modpacks is not required for playing on the server besides adding more vibes to the server.

</details>

<details>

<summary>26.2 – 7/7/2026</summary>

After some hiatus due to server-sided issues, the server is now on Minecraft 26.2. Everything is still intact.

### Temporarily disabled

* Bedrock support

### Performance note

This version of the game added Vulkan support. If you play on an Apple Silicon Mac or any PC with a modern GPU, set preferred graphics to Vulkan within the game's video options for those extra performance boost

</details>

<details>

<summary>26.1.2 – 5/5/2026</summary>

The server is now updated to Minecraft 26.1.2, aka the Tiny Takeover Update. You can now play around with the new baby mobs while being in debt. monkas

### Additional changes:

* The mineshaft now used the design from the Dungeons and Taverns mod. It doesn't look as gigantic, but are more in line with vanilla parity.
* Some custom structures are disabled (for now).

</details>

<details>

<summary>1.21.11 – 12/15/2025</summary>

Updated to Mounts of Mayhem

</details>

<details>

<summary>1.21.10 – 10/19/2025</summary>

At last, the server has been updated to include the Copper Age update. In addition, Beyond Vanilla content also got a pretty big update that may or may not messed up more stuff with the vaults.

Note: Image2Map has been deprecated in favor of a more stable solution. I'll reveal it when I have the time

</details>

<details>

<summary>1.21.8 – 8/4/2025</summary>

* \[IMPORTANT] Server IP is now `smp.sheldonbois.dpdns.org`. I promise that I won't change it again, and this is just a general rename to anticipate more use of our domain with Compute Cluster apps
* \[Update] Server is now on version 1.21.8
* \[Reintroduction] All 'Beyond Vanilla' custom features are available again.
* \[Reintroduction] Bedrock Edition client support. For now, this requires ownership of Java Edition. Let me know if you only have a Bedrock account.
* \[Removal] As Mojang now introduced the official way to get fireflies particle, you will no longer see them in the swamp as introduced in the _Beyond Vanilla_ feature set. Mod's developer also stopped updating it.

</details>

<details>

<summary>1.21.6 – 6/20/2025</summary>

The happy ghast has arrived on the server. Luckily, the many mods are updated quickly, so I've decided to push the server up as well.

* Update to 1.21.6
* Certain custom structures are temporarily not available pending updates.

</details>

<details>

<summary>Spring to Life (1.21.5) – 4/11/2025</summary>

* Update to 1.21.5
* Image2Map temporarily made unavailable
* Sitting mechanics are now easier. You can sit by simply look down and crouch.

</details>

<details>

<summary>The Garden Awakens – 12/21/2024</summary>

* Update to 1.21.4
* Bundles are now part of the core game

</details>

<details>

<summary>Beyond Vanilla – 8/6/2024</summary>

Presenting the most unusual addition to the server up to date.

Ever since the beginning, the SMP has so far been a place where all of us would do two things: messing about and adventuring. We might be very bright minded with the first one even up to today, but the latter has become increasingly dry despite with the yearly game update. For this reason, time to go modded bois!

Before getting into the new stuff, here are the boring changes since updating to 1.21:

* Image2Map command is now available again
* Improve chunk loading speed by a bit
* The 1.21 preview datapack has been removed due to redundancy

Ok, now for the new stuff:

**Gameplay**

* You can now sit down. Simply do `/sit` while standing on any block, stair, or slab you wish to lay your butt on
* Craftable invisible item frame. Combine an Item Frame with Glass Pane to create. Useful for decorations

<img src="/assets/images/2024-08-05_20.12.10.png" alt="" data-size="original">

**World**

* You will now find new dungeons across biomes and dimensions to fight your way through to find possibly new enchantments. It’s trial chambers galore. You might need to get a drink first
* Other than houses waiting to kill you, you will also find simple structures around the world too
* Most biomes now received some subtle overhaul to spruce things up a bit. Same things for the nether
* Fireflies are now a thing. They’re just chilling, and frogs don’t eat them

**Combat**

* Ender Dragon got buffed with new abilities. Good luck lol.
* ~~All mobs, ranging from Zombies to Elder Guardian, got slightly buffed with longer sighting range. Also good luck lol~~ (Edit: temporarily disabled due to potential impact to redstone contraptions. Lmk if you want to try it out)

The main theme surrounding this “update” is to introduce more variety into the world while maintaining the overall theme of vanilla Minecraft. With new places to explore, it fills in the gap that the game has been missing for a while. Doing all of these in groups are recommended.

</details>

<details>

<summary>Armored Paws – 5/31/2024</summary>

The server is now on version 1.20.6; please update to this version before joining.

Temporarily unavailable features (will update throughout time):

* Certain custom features that uses datapack may not work.
* Carpet mod

Full change-log:

* Update the game version to 1.20.6
* Image2Map has been forked to “Image2Map E”. It’s the same mod, but with some custom modification to better suit server usage.
* Re-enabled server world backup.

**1.21 update note:** Due to the trial chamber won't be completely finalized until 1.21.1, upgrading will be postponed until the release of this minor update to ensure bug free generations. It likely won't be long after the initial release.

</details>

<details>

<summary>April server update – 4/5/2024</summary>

#### Highlight

* Bedrock support: Useful for when you're away from your PC, you can now join the server using the Bedrock Edition of Minecraft on any supported platform. Compatibility is not flawless, but is beyond playable. More info about playing on Bedrock [here](https://www.notion.so/Server-info-407e97beb438452c8bc93f41f75eb93a?pvs=21).
  * Known issue: Chunks may fail to load randomly unless you reload or go into a different dimension. If this happens, you may try to set your render distance to 24 or at least 6 above the server’s max value as a temporary work around.
* Image2Map tweaks:
  * Generating custom map now requires that you have enough empty map(s) in your inventory.
  * `/normalize <WIDTH>` command to allow easier image resizing in Minecraft blocks without changing the aspect ratio.
  * Generating bigger maps will no longer give you a bundle of maps, but instead individual maps.
  * Breaking a bigger map out of the item frame will no longer delete the entire thing and not giving any back.
  * Fix a bug where the custom maps will get automatically remove if the player’s inventory is full.

#### Full changelog

* Added the [Geyser](https://geysermc.org/) mod for Bedrock support.
* Added the [Hurricane](https://modrinth.com/mod/hurricane) mod to improve Bedrock compatibility with the server.
* Update the Image2Map mod with a customized version.

</details>

<details>

<summary>Poisonous Potato Update – 4/1/2024</summary>

Server is now “updated” to version 24w14potato

The following features are either temporarily not available or may not work properly:

* All stuff listed on the additional feature page with the exception of Proximity Voice Chat and Virtual Reality

</details>

<details>

<summary>VR support – 3/17/2024</summary>

Using the [Vivecraft](https://modrinth.com/mod/vivecraft) mod and any SteamVR supported virtual reality headset, it is now possible to play on the server with proper support for room-scale interaction and movement in virtual reality. Animations of VR players can be seen in-game by any players even if they’re not in VR nor have the Vivecraft mod installed.

Full changelog:

* Added support for the Vivecraft mod.

</details>

<details>

<summary>A plentiful update – 3/13/2024</summary>

You can now do more things in Minecraft (at least on this server). This is not a Minecraft version update.

Changelog:

* It’s now possible to put custom audio into a Music Disc or Goat Horn with the `audioplayer` command. **Required** the Simple Voice Chat mod.
* It’s now possible to put custom images onto map with `image2map` command.
* Some upcoming Minecraft blocks are now available to use. They’re deemed to be feature completed, so it is safe to use them in their current state.
* Re-added crafting recipe for Bundle.
* Server will restart everyday at _TBD_ time for automatic mod & datapack updates.
* Some more Minecraft bug fixes with mods.
* Removed Herobrine

</details>

<details>

<summary>1.20.4 – 12/11/2023</summary>

Server is now running on Minecraft release version 1.20.4

</details>

<details>

<summary>Initial server creation – 3/17/2023</summary>



</details>

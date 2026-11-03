---
title: "Custom Paintings"
description: "Add your own image to the server as paintings!"
icon: "image-stack"
weight: 160
wiki_group: "College Debt SMP"
nested: true
---

Players can submit custom paintings to be added to the server's global resource pack.

### Submission instructions

#### Step 0: Prerequisites

* Have the images you want to turn into Minecraft paintings.
* Have a GitHub account. If you have not, you can create one for free (note: at this time, we cannot link your Cloud Debt account to GitHub).
* Provide CherryQuartzio with your GitHub username. We will need to whitelist you to the repository in order for you to create a submission.

#### Step 1: Create your Custom Painting Zip

1. Go to [mc-tools.net](https://mc-tools.net/paintings).
2. Upload the images you want to turn into paintings and adjust it to your liking. To maintain consistency with vanilla Minecraft paintings, use 1x or 2x scaling.
3. Download the generated resource pack `.zip` file. Ensure the zip contains the `mctools.json` file and the painting PNG textures.
4. Optionally, load the resource pack in game to see what your custom image would look like. If you wish to edit it further, you can modify the respective `.png` file inside the resource pack archive.

#### Step 2: Submit via GitHub Issues

1. Open a **New Issue** in the [resource pack repository](https://github.com/College-Debt-SMP/resource-pack). Make sure you're signed into your GitHub account.
2. Attach your downloaded `.zip` file directly into the issue description box.
3. Add the **`painting-submission`** label to your issue. Do this, or else your request will be ignored!
4. Create.

#### Managing Existing Submissions (if necessary)

You can manage or modify your submission directly from the closed issue thread:

**Undo / Revert a Submission:**

* Reply to your closed submission issue with the exact comment: `undo`
* The bot will remove all textures and datapack entries associated with that issue.

**Replace / Update a Submission:**

* Reply to your closed submission issue with a comment attaching a **new `.zip` file**.
* The bot will automatically revert your old submission and process the new zip file.

> **Note:** If you have already undone a submission and want to submit again later, please open a **new issue** rather than commenting on the old one.

**Rename title and author:**

* Edit the title of your painting using the command `rename`.
* Edit the author name of your painting using the command `author`.

### Witness your artwork in-game

Once your submission is processed, the server will detect the changes and will automatically schedule a restart for within 10 minutes. Your paintings will be on the server after the restart and can be obtained by cycling through the in-game Painting item.

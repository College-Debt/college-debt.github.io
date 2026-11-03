---
title: "Tailscale"
description: "Our self-managed VPN"
icon: "circle-wifi-circle-wifi"
cover: "/assets/wiki/Screenshot 2025-08-20 at 00-18-48 Tailscale · Best VPN"
weight: 270
wiki_group: "Tech stuff"
---

To assist with accessing the server in scenarios where using the public IP is undesirable, you can use Tailscale.

## Connect

1. Download [Tailscale](https://tailscale.com/download) for your device
2. Connect the client to the server VPN URL for your specific platform. Note that you will not use the default Tailscale login screen

{{< tabs >}}
{{< tab "Windows/Linux" >}}
Open the Terminal or Powershell and type in the following command:

```bash
tailscale login --login-server https://hs.sheldonbois.dpdns.org
```

Then follow the instructions in the opened browser window
{{< /tab >}}

{{< tab "macOS" >}}
* Option + Click the Tailscale icon in the menu and hover over the Debug menu
* Under `Custom Login Server`, select `Add Account...`
* Enter the url `https://hs.sheldonbois.dpdns.org` and press `Add Account`
* Continue in the browser
{{< /tab >}}

{{< tab "Android" >}}
* Open the app and select the settings menu in the upper-right corner
* Tap on `Accounts`
* In the kebab menu icon (three dots) in the upper-right corner select `Use an alternate server`
* Enter `https://hs.sheldonbois.dpdns.org` and follow the instructions
{{< /tab >}}

{{< tab "iOS/iPadOS" >}}
* Open the Tailscale app
* Click the account icon in the top-right corner and select `Log in…`.
* Tap the top-right options menu button and select `Use custom coordination server`.
* Enter `https://hs.sheldonbois.dpdns.org`
* Continue in browser pop up
{{< /tab >}}
{{< /tabs >}}

3. Authenticate using your Cloud Debt 365 account within the browser. If successful, it will display a message that the process is complete, and you can close the browser screen

## Usage

Make sure that the toggle/indicator to connect is on within the Tailscale app/menu. If it is without any error message, then your device is on the VPN.

While connected, you can access Server Cluster apps indicated with ⚿ on the dashboard. In addition, you can also join the College Debt SMP using its VPN address. It's also fine to leave the VPN connected if you're not accessing the server, as your usual network connection should remain.

Anything that requires the VPN for access will have its URL be in the format `[name].sheldonbois.ts`. In addition, any devices connected to the VPN can have its IP address be referenced in the same way.

## Additional features

The Tailscale client comes with additional features that utilized device to device connection. Below are a few that I think can be useful for our shenanigans.

### Taildrop

Taildrop allows you to share files on your system with other devices to anyone who is currently connected to the server VPN. You don't need to be in close proximity with each other.

{{< embed "https://tailscale.com/kb/1106/taildrop" >}}

### Tailscale Serve

Tailscale Serve allows you to share any local services running on your computer with other devices and people connected to the server VPN. Use case includes if you want to share any website you're currently developing on your machine with other people, or if you want people to directly join your multiplayer LAN game session without being on the same local network. Anything that exposes a port on your system can be shared.

{{< embed "https://tailscale.com/kb/1312/serve" >}}

### Other

You can find a bunch of other features that might be useful for your use case from the Tailscale website.

{{< embed "https://tailscale.com/features" >}}

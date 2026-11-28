---
title: "Server system"
description: "The meat behind College Debt"
icon: "server"
weight: 230
wiki_group: "Support"
---

This page gives a quick overview of the College Debt website, game servers, and the infrastructure behind them. It's a bit more on a technical side, but is nevertheless an interesting read.

## Website

The public site and this wiki at [collegedebt.app](https://collegedebt.app) are built as a static site with Hugo and Pagefind, automatically deployed via GitHub Actions to GitHub Pages behind Cloudflare.

Member-only features—like the [Custom Paintings Studio](/paintings/)—sign you in with your College Debt Microsoft 365 account via Cloudflare Zero Trust Access. Dynamic requests from the studio are handled by a Cloudflare Worker API, which validates uploaded artwork and updates the shared server resource pack repository without needing a separate backend server running 24/7.

Live uptime and player counts are published on the [status page](https://status.collegedebt.app).

## Servers & nodes

Game servers and supporting tools run as Docker containers across a small set of Linux nodes:

| Machine | Provider | Location | Role |
| --- | --- | --- | --- |
| **Ampere** | CherryQuartzio (Oracle Cloud) | San Jose | Primary node running the Minecraft servers (`smp.collegedebt.app` and `cobble.collegedebt.app` behind `minecraft-router`), automated updates, and scheduled maintenance restarts. |
| **Marionet** | CherryQuartzio (Homelab) | Sacramento | Local mini PC homelab with stronger single-core performance; runs Proxmox LXCs including Uptime Kuma (`status.collegedebt.app`), Cloudflare Tunnel ingress, and backup capacity for extra workloads. |
| **OCI Micro** | CherryQuartzio (Oracle Cloud) | — | Lightweight cloud node hosting auxiliary network services such as Switch LAN Play. |

Because services are containerized, losing a secondary node generally only affects the specific apps hosted on it rather than taking down the main Minecraft server.

## Tech infrastructure

* **Container management:** Nodes are managed through **Dockhand** ([container management interface](https://cmi.cherri.qzz.io/)), where members with access can inspect logs or perform a [manual restart](/wiki/college-debt-smp/play/manual-restart/).
* **Private networking:** Node-to-node traffic runs over our self-hosted [Tailscale](/wiki/support/tailscale/) network (`hs.sheldonbois.dpdns.org`).
* **Public access & security:** Web interfaces and internal tools are exposed through **Cloudflare Tunnels** and protected by **Cloudflare Zero Trust Access** so our nodes' IP addresses stay private whenever possible, leaving only game ports exposed where needed.
* **Backups:** Minecraft world backups run on schedule twice daily and are uploaded remotely to SharePoint (see [Server configs](/wiki/college-debt-smp/server-configs/)).

## Contributing hardware

If you have a spare server, PC, or homelab and want to help host extra game servers or side projects for the group, you can add it as a managed node.

{{< content-ref url="add-your-machine.md" >}}add-your-machine.md{{< /content-ref >}}

If you are new to self-hosting and want to learn the basics first:

{{< content-ref url="homelab-101.md" >}}homelab-101.md{{< /content-ref >}}
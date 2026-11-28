---
title: "Add your machine"
description: "Power in number"
icon: "square-dashed-circle-plus"
weight: 240
wiki_group: "Support"
nested: true
---

If you have a spare PC, homelab, or cloud VM sitting around, you can contribute its computing resources to College Debt to help run extra workloads like additional game servers or community tools.

## How it works

Contributed machines run Linux with Docker and join our existing setup as an additional managed node alongside our other servers.

* **Transparency:** We will never deploy or run anything on your machine unless we ask and clear it with you beforehand.
* **Leave anytime:** It is your hardware—you can withdraw your server from College Debt management at any time.

## Requirements

* **Docker-ready host:** A Linux machine (bare metal, VM, or LXC) capable of running Docker containers reliably when needed.
* **Reachability:** Your node must be reachable either **over the public internet** or **via our [Tailscale](/wiki/support/tailscale/) network**. Using Tailscale is recommended if you are hosting from home behind a router/NAT or would rather not expose ports publicly.

## Getting started

Reach out to an admin (see [Get help](/wiki/support/get-help/)) with:

1. Rough hardware specs (CPU, RAM, available storage) and whether it stays online 24/7 or on-demand.
2. Whether you prefer connecting the node over **Tailscale** or a **public address**.

From there, we'll walk through joining the node to Tailscale (if needed) and pairing it with Dockhand.

If you do not have a machine yet and want to explore setting one up for free or repurposing old hardware:

{{< content-ref url="homelab-101.md" >}}homelab-101.md{{< /content-ref >}}
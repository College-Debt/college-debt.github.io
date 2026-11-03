---
title: "Server system"
description: "The meat behind College Debt"
icon: "server"
weight: 230
wiki_group: "Tech stuff"
---

This page describes the system that powers everything College Debt.

### Overview

Computing resources are available on a community sharing basis, which, as of right now, are entirely provided by Quang. Software are deployed as containers running on one of the Linux-based nodes listed below.

<table><thead><tr><th width="105">Machine</th><th width="134">Provider<select multiple><option value="5DSeyi17YvRi" label="CherryQuartzio" color="blue"></option><option value="j54XGj85yj07" label="Oracle Cloud" color="blue"></option></select></th><th width="117">Location</th><th>Notes</th></tr></thead><tbody><tr><td>Ampere</td><td><span data-option="5DSeyi17YvRi">CherryQuartzio, </span><span data-option="j54XGj85yj07">Oracle Cloud</span></td><td>San Jose</td><td>Primary node. Free of charge from any operational cost.</td></tr><tr><td>Marionet</td><td><span data-option="5DSeyi17YvRi">CherryQuartzio</span></td><td>Sacramento</td><td>Quang's local mini PC homelab. Faster single core performance.</td></tr></tbody></table>

The Ampere node currently carries the Minecraft Server and acts as the primary coordinating node within the server network. Any other node(s) serves as additional backup if the primary node can't meet the demanded workload. Failure of one node generally do not affect the up time of the other nodes unless they rely on a running software from the disconnected node. We will mainly use these machines for running game servers, self-hosting tools, and any other application on demand.

For better security, each nodes communicated with each other over the internet via Tailscale. Cloudflare Tunnels are used for services that communicates through HTTP/HTTPS via a public URL. We aimed to avoid exposing the real IP address of our nodes with the exception of the primary node for certain circumstances.

### Scalability

If we ever need to expand our computing power and have it scaled across all available machines, we can add any PC/homelab onto the global cluster as a worker node using Kubernetes. Any system added onto the cluster can also be easily disconnected from it as well if the desire or demand changes.

{{< hint "info" >}}
We currently have no need for more computing power, but you're free to add your machine if you wish to contribute.
{{< /hint >}}

{{< content-ref url="add-your-machine.md" >}}add-your-machine.md{{< /content-ref >}}

If you need a quick introduction to self-hosting.

{{< content-ref url="homelab-101.md" >}}homelab-101.md{{< /content-ref >}}

---
title: "Manual restart"
description: "When the server is not awake for some reason"
icon: "arrows-rotate"
weight: 80
wiki_group: "College Debt SMP"
nested: true
---

The server container by itself should always be available for the majority of the time. If you need to manually reboot it for whatever reason, keep reading.

{{< hint "info" >}}
Before proceeding further, ensure that the server is not intentionally down for a planned maintenance.
{{< /hint >}}

{{< hint "warning" >}}
Unless you know what you're doing, do not modify the server's Docker Compose stack configuration file.
{{< /hint >}}

{{< stepper >}}
{{< step >}}
Log into the [container management interface](https://cmi.cherri.qzz.io/) with your Cloud Debt account
{{< /step >}}

{{< step >}}
Navigate to <i class="fa-docker">:docker:</i> **Ampere** → <i class="fa-cube">:cube:</i> **Containers** → **cdsmp**
{{< /step >}}

{{< step >}}
Click on <i class="fa-arrows-rotate">:arrows-rotate:</i> **Restart**
{{< /step >}}

{{< step >}}
Wait until the container turns healthy. Optionally, look at the container log to ensure graceful start.
{{< /step >}}
{{< /stepper >}}

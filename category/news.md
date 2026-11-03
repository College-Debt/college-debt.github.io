---
layout: archive
title: "Category: News"
permalink: /category/news/
---

{% assign category_posts = site.posts | where: "category", "News" %}
{% include post_list.html posts=category_posts %}

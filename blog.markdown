---
layout: default
title: Blog
permalink: /blog/
---

<h1>Blogs</h1>

{% assign sorted = site.blog | sort: "date" | reverse %}

<ul>
  {% for post in sorted %}
    <li>
      <a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a> - {{ post.date | date: "%Y-%m-%d" }}<br>
      <small>{{ post.description | default: post.excerpt | strip_html | truncate: 120 }}</small>
    </li>
  {% endfor %}
</ul>

---
layout: default
title: Blog
permalink: /blog/
---
<h1>Blog</h1>
<ul>
  {% for post in site.blog %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a> - {{ post.date | date: "%Y-%m-%d" }}<br>
      <small>{{ post.description | default: post.excerpt | strip_html | truncate: 120 }}</small>
    </li>
  {% endfor %}
</ul>

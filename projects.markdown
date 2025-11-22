---
layout: default
title: Projects
permalink: /projects/
---
<h1>Projects</h1>
<ul>
  {% for project in site.projects %}
    <li>
      <a href="{{ project.url }}">{{ project.title }}</a> - {{ project.date | date: "%Y-%m-%d" }}<br>
      <small>{{ project.description | default: project.excerpt | strip_html | truncate: 120 }}</small>
    </li>
  {% endfor %}
</ul>

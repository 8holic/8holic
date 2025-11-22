---
layout: default
title: Virtual Records
permalink: /vrecords/
---
<h1>Virtual Records</h1>
<ul>
  {% for record in site.vrecords %}
    <li>
      <a href="{{ record.url }}">{{ record.title }}</a> - {{ record.date | date: "%Y-%m-%d" }}<br>
      <small>{{ record.description | default: record.excerpt | strip_html | truncate: 120 }}</small>
    </li>
  {% endfor %}
</ul>

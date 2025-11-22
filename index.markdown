---
layout: default
title: Home
---
<h1>Welcome to this hidden corner</h1>

<h2>Latest Blog Post</h2>
{% assign latest_blog = site.blog | sort: 'date' | last %}
{% if latest_blog %}
  <div>
    <a href="{{ latest_blog.url }}">{{ latest_blog.title }}</a> - {{ latest_blog.date | date: "%Y-%m-%d" }}<br>
    <small>{{ latest_blog.description | default: latest_blog.excerpt | strip_html | truncate: 120 }}</small>
  </div>
{% else %}
  <p>No blog posts yet.</p>
{% endif %}

<h2>Latest Virtual Record</h2>
{% assign latest_vrecord = site.vrecords | sort: 'date' | last %}
{% if latest_vrecord %}
  <div>
    <a href="{{ latest_vrecord.url }}">{{ latest_vrecord.title }}</a> - {{ latest_vrecord.date | date: "%Y-%m-%d" }}<br>
    <small>{{ latest_vrecord.description | default: latest_vrecord.excerpt | strip_html | truncate: 120 }}</small>
  </div>
{% else %}
  <p>No virtual records yet.</p>
{% endif %}

<h2>Latest Project</h2>
{% assign latest_project = site.projects | sort: 'date' | last %}
{% if latest_project %}
  <div>
    <a href="{{ latest_project.url }}">{{ latest_project.title }}</a> - {{ latest_project.date | date: "%Y-%m-%d" }}<br>
    <small>{{ latest_project.description | default: latest_project.excerpt | strip_html | truncate: 120 }}</small>
  </div>
{% else %}
  <p>No projects yet.</p>
{% endif %}

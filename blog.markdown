---
layout: default
title: Blog
---

<h1>{{ page.title }}</h1>

<ul class="blog-list">
  {% for post in site.posts %}
    <li class="blog-item">

<div class="blog-meta">

  <a href="{{ post.url | relative_url }}" class="blog-title">{{ post.title }}</a>

  <span class="blog-date">
    {{ post.date | date: "%b %-d, %Y" }}
  </span>

  {% if post.categories %}
    <span class="blog-categories">
      (
      {% for cat in post.categories %}
        {{ cat }}{% unless forloop.last %}, {% endunless %}
      {% endfor %}
      )
    </span>
  {% endif %}

  {% if post.description %}
    <p class="blog-description">
      <strong>Excerpt:</strong> {{ post.description }}
    </p>
  {% else %}
    {% assign first_line = post.content | strip_html | strip | split: "\n" | first %}
    <p class="blog-description">
      <strong>Excerpt:</strong> {{ first_line | truncatewords: 8 }}
    </p>
  {% endif %}

</div>

    </li>
  {% endfor %}
</ul>

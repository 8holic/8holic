---
layout: default
title: Articles
banner_image: /assets/images/generic-banner.jpg
banner_title: Articles
banner_subtitle: "Thoughts and efforts went into writing these reflecting on various topics"
permalink: /articles/
---
{% include banner.html listing=true %}

<section class="recent-posts">
  {% assign articles = site.articles | sort: 'end' | reverse %}
  <input type="search" class="title-search" data-target="#article-list" placeholder="Search article titles…" aria-label="Search articles by title">
  {% if articles.size > 0 %}
    <div class="post-list" id="article-list">
      {% for article in articles %}
        {% assign adir = '/assets/images/post-photos/' %}
        {% if article.maintag == 'Project' %}{% assign adir = '/assets/images/project-photos/' %}{% endif %}
        {% assign has_thumb = false %}
        {% if article.banner_image and article.banner_image != "" %}{% assign has_thumb = true %}{% endif %}
        {% assign a_start = article.start | date: "%b %Y" %}
        {% assign a_end = article.end | date: "%b %Y" %}
        <article class="post-preview card-mt mt-{{ article.maintag | slugify }}" data-title="{{ article.title | downcase | escape }}">
          <div class="post-thumbnail{% unless has_thumb %} post-icon{% endunless %}">
            {% if has_thumb %}
              <img src="{{ adir | append: article.banner_image | relative_url }}" alt="{{ article.title }}">
            {% else %}
              {% assign icon_slug = article.maintag | slugify %}
              <img src="{{ '/assets/images/icons/' | append: icon_slug | append: '.svg' | relative_url }}" alt="">
            {% endif %}
          </div>
          <div class="post-info">
            {% assign words = article.content | number_of_words %}
            <h3><a href="{{ article.url | relative_url }}">{{ article.title }}</a></h3>
            <p class="post-meta">{{ article.maintag }} · {{ a_start }}{% if a_end != a_start %} – {{ a_end }}{% endif %} · {{ words | divided_by: 180 | plus: 1 }} min read</p>
            {% if article.tags %}<div class="tags">{% for tag in article.tags %}<span class="pill">{{ tag }}</span>{% endfor %}</div>{% endif %}
            {% assign art_excerpt = article.excerpt | strip_html | strip %}
            {% if art_excerpt != "" %}<p>{{ art_excerpt | truncatewords: 30 }}</p>{% endif %}
          </div>
        </article>
      {% endfor %}
    </div>
    <p class="post-filter-empty" hidden>No articles match that search.</p>
  {% else %}
    <p>No articles yet. Check back soon!</p>
  {% endif %}
</section>

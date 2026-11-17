---
layout: default
title: Tags
banner_image: /assets/images/tags-banner.jpg
banner_title: Tags
banner_subtitle: ""
permalink: /tags/
---

<section class="tag-index">
  <h2>All Tags</h2>

  {% assign all_items = site.articles | concat: site.posts %}
  {% assign tags = all_items | map: 'tags' | flatten | uniq | sort %}
  {% if tags.size > 0 %}
    <div class="tag-list">
      {% for tag in tags %}
        <div class="card tag-group">
          <h3 id="{{ tag | slugify }}">{{ tag | capitalize }}</h3>
          <ul>
            {% for item in all_items %}
              {% if item.tags contains tag %}
                <li>
                  <a href="{{ item.url | relative_url }}">{{ item.title }}</a>
                  <span class="post-date">({{ item.date | date: "%b %d, %Y" }})</span>
                </li>
              {% endif %}
            {% endfor %}
          </ul>
        </div>
      {% endfor %}
    </div>
  {% else %}
    <p>No tags yet.</p>
  {% endif %}
</section>

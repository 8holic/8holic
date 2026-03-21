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

  {% assign tags = site.posts | map: 'tags' | flatten | uniq | sort %}
  {% if tags.size > 0 %}
    <div class="tag-list">
      {% for tag in tags %}
        <div class="card tag-group">
          <h3 id="{{ tag | slugify }}">{{ tag | capitalize }}</h3>
          <ul>
            {% for post in site.posts %}
              {% if post.tags contains tag %}
                <li>
                  <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
                  <span class="post-date">({{ post.date | date: "%b %d, %Y" }})</span>
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
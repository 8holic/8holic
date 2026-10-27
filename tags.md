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
                {% unless post.series and post.series_part and post.series_part > 1 %}
                  {% assign tag_title = post.title %}
                  {% assign tag_href = post.url %}
                  {% if post.series %}
                    {% assign hub = site.pages | where: "series", post.series | first %}
                    {% assign tag_title = post.series_title | default: hub.title | default: post.title %}
                    {% assign tag_href = hub.url | default: post.url %}
                  {% endif %}
                  <li>
                    <a href="{{ tag_href | relative_url }}">{{ tag_title }}</a>
                    <span class="post-date">({{ post.date | date: "%b %d, %Y" }})</span>
                  </li>
                {% endunless %}
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
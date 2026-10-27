---
layout: default
title: All Posts
banner_image: /assets/images/posts-banner.jpg
banner_title: All Posts
banner_subtitle: ""
permalink: /posts/
---
{% include banner.html %}

<section class="recent-posts">
  {% assign posts = site.posts | sort: 'date' | reverse %}
  {% if posts.size > 0 %}
    {% assign all_tags = site.posts | map: 'tags' | flatten | uniq | sort %}
    <div class="post-filter card">
      <div class="post-filter-section">
        <div class="post-filter-header">
          <h2>Filter by tag</h2>
          <button type="button" class="post-filter-clear is-active" data-tag="all">All</button>
        </div>
        {% if all_tags.size > 0 %}
          <div class="tag-filter-list" role="list">
            {% for tag in all_tags %}
              <button type="button" class="tag-filter-btn" data-tag="{{ tag | slugify }}">{{ tag }}</button>
            {% endfor %}
          </div>
        {% endif %}
      </div>
      <div class="post-filter-section">
        <div class="post-filter-header">
          <h2>Filter by type</h2>
          <button type="button" class="format-filter-clear is-active" data-format="all">All</button>
        </div>
        <div class="tag-filter-list" role="list">
          <button type="button" class="format-filter-btn" data-format="essay">Essays</button>
          <button type="button" class="format-filter-btn" data-format="log">Logs</button>
        </div>
      </div>
    </div>

    <div class="post-list">
      {% assign series_hubs = site.pages | where: "layout", "series" | sort: "updated" | reverse %}
      {% for hub in series_hubs %}
        {% assign series_parts = site.posts | where: "series", hub.series | sort: "series_part" %}
        {% assign series_dates = site.posts | where: "series", hub.series | sort: "date" %}
        {% assign series_minutes = 0 %}
        {% for series_part in series_parts %}
          {% assign part_words = series_part.content | number_of_words %}
          {% assign part_minutes = part_words | divided_by: 180 | plus: 1 %}
          {% assign series_minutes = series_minutes | plus: part_minutes %}
        {% endfor %}
        {% assign first_month = series_dates.first.date | date: "%b %Y" %}
        {% assign last_month = series_dates.last.date | date: "%b %Y" %}
        {% assign card_meta = series_parts.size | append: " chapters · " | append: first_month %}
        {% if first_month != last_month %}
          {% assign card_meta = card_meta | append: " – " | append: last_month %}
        {% endif %}
        {% assign card_meta = card_meta | append: " · ~" | append: series_minutes | append: " min total" %}
        {% if hub.series_status %}
          {% assign card_meta = card_meta | append: " · " | append: hub.series_status %}
        {% endif %}
        <article class="post-preview series-preview{% unless hub.image %} no-img{% endunless %}" data-tags="{% for tag in hub.tags %}{{ tag | slugify }}{% unless forloop.last %},{% endunless %}{% endfor %}" data-format="{{ hub.format | default: 'Log' | slugify }}">
          {% if hub.image %}
            <div class="post-thumbnail">
              <img src="{{ hub.image | relative_url }}" alt="{{ hub.title }}">
            </div>
          {% endif %}
          <div class="post-info">
            <p class="post-kicker">Series · {{ hub.format | default: "Log" | capitalize }}</p>
            <h3><a href="{{ hub.url | relative_url }}">{{ hub.title }}</a></h3>
            <p class="post-meta">{{ card_meta }}</p>
            {% if hub.description %}
              <p>{{ hub.description | strip_html | truncatewords: 30 }}</p>
            {% endif %}
          </div>
        </article>
      {% endfor %}

      {% for post in posts %}
        {% unless post.series %}
          <article class="post-preview{% unless post.banner_image %} no-img{% endunless %}" data-tags="{% for tag in post.tags %}{{ tag | slugify }}{% unless forloop.last %},{% endunless %}{% endfor %}" data-format="{{ post.format | default: 'Log' | slugify }}">
            {% if post.banner_image %}
              {% assign thumb_path = "/assets/images/post-photos/" | append: post.banner_image %}
              <div class="post-thumbnail">
                <img src="{{ thumb_path | relative_url }}" alt="{{ post.title }}">
              </div>
            {% endif %}
            <div class="post-info">
              <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
              <p class="post-meta">{{ post.format | default: "Log" | capitalize }} · {{ post.date | date: "%b %d, %Y" }}</p>
              {% if post.excerpt %}
                <p>{{ post.excerpt | strip_html | truncatewords: 30 }}</p>
              {% endif %}
            </div>
          </article>
        {% endunless %}
      {% endfor %}
    </div>
    <p class="post-filter-empty" hidden>No posts match those filters.</p>
  {% else %}
    <p>No posts yet. Check back soon!</p>
  {% endif %}
</section>

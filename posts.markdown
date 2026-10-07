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

    <div class="post-list">
      {% for post in posts %}
        <article class="post-preview{% unless post.banner_image %} no-img{% endunless %}" data-tags="{% for tag in post.tags %}{{ tag | slugify }}{% unless forloop.last %},{% endunless %}{% endfor %}">
          {% if post.banner_image %}
            {% assign thumb_path = "/assets/images/post-photos/" | append: post.banner_image %}
            <div class="post-thumbnail">
              <img src="{{ thumb_path | relative_url }}" alt="{{ post.title }}">
            </div>
          {% endif %}
          <div class="post-info">
            <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
            <p class="post-meta">{{ post.date | date: "%b %d, %Y" }}</p>
            {% if post.excerpt %}
              <p>{{ post.excerpt | strip_html | truncatewords: 30 }}</p>
            {% endif %}
          </div>
        </article>
      {% endfor %}
    </div>
    <p class="post-filter-empty" hidden>No posts match that tag.</p>
  {% else %}
    <p>No posts yet. Check back soon!</p>
  {% endif %}
</section>

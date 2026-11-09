---
layout: default
title: Ramblings
banner_image: /assets/images/posts-banner.jpg
banner_title: Ramblings
banner_subtitle: "One shot writings about my thoughts"
permalink: /posts/
---
{% include banner.html listing=true %}

<section class="recent-posts">
  {% assign posts = site.posts | sort: 'date' | reverse %}
  <input type="search" class="title-search" data-target="#post-list" placeholder="Search rambling titles…" aria-label="Search ramblings by title">
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
    </div>

    <div class="post-list" id="post-list">
      {% for post in posts %}
        {% assign thumb = "" %}
        {% if post.featured_image_override %}
          {% assign thumb = post.featured_image_override %}
        {% elsif post.banner_image and post.banner_image != "" %}
          {% assign thumb = '/assets/images/post-photos/' | append: post.banner_image %}
        {% endif %}
        {% assign has_thumb = false %}
        {% if thumb != "" %}{% assign has_thumb = true %}{% endif %}
        <article class="post-preview card-mt mt-{{ post.maintag | slugify }}" data-title="{{ post.title | downcase | escape }}" data-tags="{% for tag in post.tags %}{{ tag | slugify }}{% unless forloop.last %},{% endunless %}{% endfor %}">
          <div class="post-thumbnail{% unless has_thumb %} post-icon{% endunless %}">
            {% if has_thumb %}
              <img src="{{ thumb | relative_url }}" alt="{{ post.title }}">
            {% else %}
              {% assign icon_slug = post.maintag | slugify %}
              <img src="{{ '/assets/images/icons/' | append: icon_slug | append: '.svg' | relative_url }}" alt="">
            {% endif %}
          </div>
          <div class="post-info">
            <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
            <p class="post-meta">{{ post.date | date: "%b %d, %Y" }}</p>
            {% assign post_excerpt = post.excerpt | strip_html | strip %}
            {% if post_excerpt != "" %}
              <p>{{ post_excerpt | truncatewords: 30 }}</p>
            {% endif %}
          </div>
        </article>
      {% endfor %}
    </div>
    <p class="post-filter-empty" hidden>No ramblings match those filters.</p>
  {% else %}
    <p>No ramblings yet. Check back soon!</p>
  {% endif %}
</section>

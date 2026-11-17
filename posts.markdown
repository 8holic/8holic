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

    <div class="post-list feed" id="post-list">
      {% for post in posts %}
        {% assign icon_slug = post.maintag | slugify %}
        {% assign thumb = "" %}
        {% if post.featured_image_override %}
          {% assign thumb = post.featured_image_override %}
        {% elsif post.banner_image and post.banner_image != "" %}
          {% assign thumb = '/assets/images/post-photos/' | append: post.banner_image %}
        {% endif %}
        {% assign post_words = post.content | number_of_words %}
        {% assign post_preview = post.content | strip_html | strip | truncate: 400 %}
        {% assign is_video = false %}
        {% if post.content contains '<iframe' or post.content contains 'youtube.com' or post.content contains 'youtu.be' %}
          {% assign is_video = true %}
        {% endif %}
        <article class="post-preview feed-item mt-{{ icon_slug }}" data-title="{{ post.title | downcase | escape }}" data-tags="{% for tag in post.tags %}{{ tag | slugify }}{% unless forloop.last %},{% endunless %}{% endfor %}">
          <div class="feed-head">
            <div class="feed-avatar">
              <img src="{{ '/assets/images/profile.jpg' | relative_url }}" alt="{{ site.author.name }}">
            </div>
            <div class="feed-head-text">
              <span class="feed-name">{{ site.author.name }}</span>
              <div class="feed-sub">
                <a class="feed-time" href="{{ post.url | relative_url }}">{{ post.date | date: "%b %d, %Y" }}</a>
                <span class="feed-mood">{{ post.maintag }}</span>
              </div>
            </div>
          </div>
          {% if thumb != "" %}
            <div class="feed-image"><img src="{{ thumb | relative_url }}" alt="{{ post.title }}"></div>
          {% endif %}
          <h3 class="feed-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          {% if is_video %}
            <div class="feed-body post-content">{{ post.content }}</div>
          {% else %}
            <div class="feed-body feed-preview"><p>{{ post_preview }}</p></div>
            {% if post_words <= 700 %}
              <div class="feed-body post-content feed-full" hidden>{{ post.content }}</div>
            {% endif %}
          {% endif %}
          <div class="feed-actions">
            {% if post.tags %}
              {% for tag in post.tags %}
                <a href="{{ '/tags/' | relative_url }}#{{ tag | slugify }}" class="tag">{{ tag }}</a>
              {% endfor %}
            {% endif %}
            {% unless is_video %}
              {% if post_words > 700 %}
                <a class="feed-more" href="{{ post.url | relative_url }}">Read more →</a>
              {% else %}
                <button type="button" class="feed-more feed-toggle" aria-expanded="false">Read more →</button>
              {% endif %}
            {% endunless %}
          </div>
        </article>
      {% endfor %}
    </div>
    <p class="post-filter-empty" hidden>No ramblings match those filters.</p>
  {% else %}
    <p>No ramblings yet. Check back soon!</p>
  {% endif %}
</section>

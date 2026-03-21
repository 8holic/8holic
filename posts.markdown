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
    <div class="post-list">
      {% for post in posts %}
        {% assign post_date = post.date | date: "%Y-%m-%d" %}
        {% assign thumb_path = "/post-photos/" | append: post_date | append: "-featured.jpg" %}
        <article class="post-preview">
          <div class="post-thumbnail">
            <img src="{{ thumb_path | relative_url }}" alt="{{ post.title }}">
          </div>
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
  {% else %}
    <p>No posts yet. Check back soon!</p>
  {% endif %}
</section>
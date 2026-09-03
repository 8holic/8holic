---
layout: default
title: Projects
banner_image: /assets/images/generic-banner.jpg
banner_title: Projects
banner_subtitle: ""
permalink: /projects/
---
{% include banner.html %}

<section class="recent-posts">
  {% assign projects = site.projects | sort: 'start' | reverse %}
  {% if projects.size > 0 %}
    <div class="post-list">
      {% for project in projects %}
        <article class="post-preview">
          {% if project.banner_image %}
            <div class="post-thumbnail">
              <img src="{{ '/assets/images/project-photos/' | append: project.banner_image | relative_url }}" alt="{{ project.title }}">
            </div>
          {% endif %}
          <div class="post-info">
            <h3><a href="{{ project.url | relative_url }}">{{ project.title }}</a></h3>
            <p class="post-meta">{{ project.start | date: "%b %Y" }}{% if project.end %} – {{ project.end | date: "%b %Y" }}{% endif %}</p>
            {% if project.description %}
              <p>{{ project.description }}</p>
            {% elsif project.excerpt %}
              <p>{{ project.excerpt | strip_html | truncatewords: 30 }}</p>
            {% endif %}
          </div>
        </article>
      {% endfor %}
    </div>
  {% else %}
    <p>No projects yet. Check back soon!</p>
  {% endif %}
</section>

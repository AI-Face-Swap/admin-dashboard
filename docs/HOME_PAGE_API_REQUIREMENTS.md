# Home Page & Landing Page API Requirements

This document outlines the required API endpoints and data structures needed to make the frontend landing page fully dynamic. These requirements are based on the UI reference designs and allow the admin dashboard to control text, images, videos, and footer content.

## Overview

To make the landing page sections (Hero, Latest Models, Smart Lab, Partners, and Footer) manageable from the admin dashboard, we need the backend to provide the following endpoints. 

*Note for Backend Developer: You can choose to implement these as a single aggregated endpoint (e.g., `GET /api/v1/home-page`) for better frontend load performance, or as individual endpoints as listed below. The frontend will adapt to either approach.*

---

## 1. Hero Sliders (Already Planned)
Controls the top hero section with background videos/images and main call-to-action text.

*   **Endpoint:** `GET /api/v1/sliders`
*   **Method:** GET
*   **Expected Response:**
    ```json
    {
      "data": [
        {
          "id": 1,
          "title": "Welcome to AI Generation",
          "subtitle": "Create amazing videos and images.",
          "media_url": "https://your-spaces-url.com/hero-video.mp4",
          "media_type": "video", // or "image"
          "button_text": "Get Started",
          "button_link": "/generate",
          "order": 1
        }
      ]
    }
    ```

## 2. Model Showcases (Sections with Videos)
Controls the "Latest Model" or "NextGen AI" sections that feature a descriptive text block alongside an autoplaying showcase video (Reference: `002`, `004`, `006`).

*   **Endpoint:** `GET /api/v1/home-showcases`
*   **Method:** GET
*   **Expected Response:**
    ```json
    {
      "data": [
        {
          "id": 1,
          "section_name": "Latest Model",
          "title": "Unleash Creativity with Model X",
          "description": "Generate high-quality 1080p videos in seconds...",
          "video_url": "https://your-spaces-url.com/showcase1.mp4",
          "image_fallback_url": "https://your-spaces-url.com/showcase1-poster.jpg",
          "alignment": "left", // 'left' or 'right' to alternate UI layout
          "order": 1,
          "is_active": true
        }
      ]
    }
    ```

## 3. Smart Lab & Features
Controls the feature grid / tools section (Reference: `005-smart-lab.png`, `007-creative-partner.png`).

*   **Endpoint:** `GET /api/v1/home-features`
*   **Method:** GET
*   **Expected Response:**
    ```json
    {
      "data": [
        {
          "id": 1,
          "title": "Face Swap",
          "description": "Seamlessly swap faces in photos and videos.",
          "icon_url": "https://your-spaces-url.com/icons/face-swap.png",
          "link": "/templates",
          "order": 1,
          "is_active": true
        }
      ]
    }
    ```

## 4. Partners & Sponsors
Controls the logos displayed in the "Our Partners" section above the footer (Reference: `008-footer-and-our-Partners.png`).

*   **Endpoint:** `GET /api/v1/partners`
*   **Method:** GET
*   **Expected Response:**
    ```json
    {
      "data": [
        {
          "id": 1,
          "name": "Tech Corp",
          "logo_url": "https://your-spaces-url.com/partners/tech-corp.png",
          "website_url": "https://techcorp.example.com",
          "order": 1,
          "is_active": true
        }
      ]
    }
    ```

## 5. Footer & Site Settings
Controls the global footer links, social media URLs, contact information, and copyright text.

*   **Endpoint:** `GET /api/v1/settings/footer`
*   **Method:** GET
*   **Expected Response:**
    ```json
    {
      "data": {
        "about_text": "HTUT AI is the leading platform for generating...",
        "contact_email": "support@htut.ai",
        "social_links": {
          "facebook": "https://facebook.com/...",
          "twitter": "https://twitter.com/...",
          "discord": "https://discord.gg/...",
          "youtube": "https://youtube.com/..."
        },
        "quick_links": [
          { "label": "Terms of Service", "url": "/terms" },
          { "label": "Privacy Policy", "url": "/privacy" },
          { "label": "FAQ", "url": "/faq" }
        ],
        "copyright_text": "© 2026 HTUT AI. All rights reserved."
      }
    }
    ```

---

### Implementation Notes for Backend Developer:
1. **Admin CRUD:** Each of these domains (Sliders, Showcases, Features, Partners, Footer Settings) will need standard Create/Read/Update/Delete (CRUD) pages in the Admin Dashboard.
2. **Media Uploads:** Videos and Images uploaded through the admin dashboard for these sections should be saved to our cloud storage (DigitalOcean Spaces). The APIs should return the absolute URLs to these assets.
3. **Ordering:** Most sections include an `order` field to allow the admin to drag-and-drop or define the display order of items.
4. **Active Flags:** The `is_active` boolean allows admins to temporarily hide a showcase, feature, or partner without deleting the record.

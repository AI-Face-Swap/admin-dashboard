#!/bin/bash
# Generate Admin Controllers
php artisan make:controller Admin/HomeShowcaseController
php artisan make:controller Admin/HomeFeatureController
php artisan make:controller Admin/PartnerController

# Create directories
mkdir -p resources/js/pages/admin/home-showcases
mkdir -p resources/js/pages/admin/home-features
mkdir -p resources/js/pages/admin/partners

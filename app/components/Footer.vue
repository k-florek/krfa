<template>
  <footer class="site-footer">
    <div class="footer-content">
      <!-- Social Media Links -->
      <div class="footer-section social-section">
        <h3 class="footer-heading">Connect With Me!</h3>
        <div class="social-links">
          <a 
            href="https://www.facebook.com/profile.php?id=61581490420802" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Visit our Facebook page"
            class="social-link facebook"
          >
            <i class="fa-brands fa-facebook"></i>
          </a>
          <a 
            href="https://www.instagram.com/kelseyraineart" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Visit our Instagram page"
            class="social-link instagram"
          >
            <i class="fa-brands fa-instagram"></i>
          </a>
          <a 
            href="https://bsky.app/profile/kelseyraineart.com" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Visit our Bluesky profile"
            class="social-link bluesky"
          >
            <i class="fa-brands fa-bluesky"></i>
          </a>
          
        </div>
      </div>

      <!-- Legal & Copyright -->
      <div class="footer-section legal-section">
        <div class="copyright">
          <p>&copy; {{ currentYear }} Kelsey Raine Fine Art. All Rights Reserved.</p>
        </div>
        <div class="legal-notice">
          <p class="legal-text">
            All artwork, images, and content on this website are the exclusive property of Kelsey Raine Fine Art 
            and are protected by international copyright laws. Unauthorized use, reproduction, or distribution 
            of any materials from this site without express written permission is strictly prohibited.
          </p>
        </div>
        <div class="legal-links">
          <a href="privacy_policy.html" class="legal-link">Privacy Policy</a>
          <span class="separator">|</span>
          <a href="terms-of-service.html" class="legal-link">Terms of Service</a>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="footer-section info-section">
        <p class="info-text">
          <i class="fa-solid fa-palette"></i>
          Original artwork by Kelsey Raine
        </p>
        <p class="info-text">
          <i class="fa-solid fa-shield-halved"></i>
          Stripe checkout for secure payments
        </p>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="footer-bottom">
      <p class="attribution">
        Handcrafted with <i class="fa-solid fa-heart"></i> for art lovers everywhere
      </p>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
  <footer class="site-footer">
    <div class="footer-content">
      <!-- Social Media Links -->
      <div class="footer-section social-section">
        <h3 class="footer-heading">Connect With Us</h3>
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
          Secure transactions powered by Stripe
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

<style scoped>
.site-footer {
  background: linear-gradient(135deg, var(--color-bg-subtle) 0%, var(--color-bg-body-dark) 100%);
  border-top: 2px solid var(--color-border-muted);
  margin-top: 4rem;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 3rem;
}

.footer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.footer-heading {
  font-family: "Satoshi-Regular", sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 1.5rem;
  letter-spacing: 0.02em;
}

/* Social Links */
.social-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--color-bg-body);
  color: var(--color-text-primary);
  font-size: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px var(--color-shadow-soft);
  text-decoration: none;
}

.social-link:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px var(--color-shadow-soft);
}

.social-link.instagram:hover {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
}

.social-link.bluesky:hover {
  background-color: #1285fe;
  color: white;
}

.social-link.facebook:hover {
  background-color: #1877f2;
  color: white;
}

/* Legal Section */
.legal-section {
  grid-column: 1 / -1;
}

.copyright {
  margin-bottom: 1rem;
}

.copyright p {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
}

.legal-notice {
  max-width: 800px;
  margin: 1.5rem auto;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border-left: 4px solid var(--color-link);
}

.legal-text {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0;
}

.legal-links {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.legal-link {
  color: var(--color-link);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.legal-link:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

.separator {
  color: var(--color-text-muted);
}

/* Info Section */
.info-section {
  grid-column: 1 / -1;
  gap: 1rem;
}

.info-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.info-text i {
  color: var(--color-link);
}

/* Footer Bottom */
.footer-bottom {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1.5rem 2rem;
  text-align: center;
  border-top: 1px solid var(--color-border-muted);
}

.attribution {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.attribution i.fa-heart {
  color: #e74c3c;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  10%, 30% {
    transform: scale(1.1);
  }
  20%, 40% {
    transform: scale(1);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-content {
    padding: 2rem 1rem;
    gap: 2rem;
  }

  .footer-heading {
    font-size: 1.1rem;
  }

  .social-link {
    width: 45px;
    height: 45px;
    font-size: 1.3rem;
  }

  .legal-text {
    font-size: 0.8rem;
  }

  .info-text {
    font-size: 0.85rem;
  }

  .footer-bottom {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .footer-content {
    grid-template-columns: 1fr;
  }

  .social-links {
    gap: 1rem;
  }

  .legal-links {
    flex-direction: column;
    gap: 0.5rem;
  }

  .separator {
    display: none;
  }
}
</style>
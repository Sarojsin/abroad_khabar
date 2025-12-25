class Footer {
    constructor() {
        this.footerContainer = document.getElementById('footer-container');
        this.init();
    }

    async init() {
        this.render();
    }

    render() {
        const year = new Date().getFullYear();
        const html = `
            <footer class="footer">
                <div class="container footer-content">
                    <div class="footer-logo">
                        <div class="navbar-logo-icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <span>Abroad Khabar</span>
                    </div>
                    <div class="footer-links">
                        <a href="/about">About Us</a>
                        <a href="/services">Services</a>
                        <a href="/contact">Contact</a>
                        <a href="/privacy">Privacy Policy</a>
                    </div>
                    <div class="footer-copyright">
                        &copy; ${year} Abroad Khabar. All rights reserved.
                    </div>
                </div>
            </footer>
        `;

        if (this.footerContainer) {
            this.footerContainer.innerHTML = html;
        }
    }
}

const footer = new Footer();

export async function loadFooter() {
    await footer.init();
    return footer;
}

export default footer;

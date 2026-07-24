import { Link } from 'react-router-dom';
import './HomePage.css';

/**
 * HomePage - Landing Page
 *
 * Responsibilities:
 * - Display hero section with welcome message
 * - CTA button linking to /products
 * - Preload ProductListPage chunk on hover (bundle-preload rule)
 *
 * NO product fetching — that belongs to ProductListPage
 */

// Preload ProductListPage chunk on user intent (bundle-preload rule)
const preloadProducts = () => {
    void import('../ProductListPage/ProductListPage');
};

export default function HomePage() {
    return (
        <div className="home-page">
            <div className="container">
                <section className="home-page__hero">
                    <h1 className="home-page__title">
                        Welcome to <span className="text-accent">DuynhLab</span> 👋
                    </h1>
                    <p className="home-page__subtitle">
                        Discover our curated collection of products. Browse, compare, and find exactly what you need.
                    </p>
                    <Link
                        to="/products"
                        className="home-page__cta"
                        onMouseEnter={preloadProducts}
                        onFocus={preloadProducts}
                    >
                        Browse Products →
                    </Link>
                </section>
            </div>
        </div>
    );
}

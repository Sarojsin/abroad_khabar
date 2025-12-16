from typing import Dict, Optional
import json

def generate_json_ld(
    page_type: str,
    data: Dict
) -> Optional[str]:
    """Generate JSON-LD structured data"""
    
    if page_type == "organization":
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": data.get("name", "Educational Consultancy"),
            "description": data.get("description", ""),
            "url": data.get("url", ""),
            "logo": data.get("logo", ""),
            "telephone": data.get("phone", ""),
            "email": data.get("email", ""),
            "address": {
                "@type": "PostalAddress",
                "streetAddress": data.get("address", ""),
                "addressLocality": data.get("city", ""),
                "postalCode": data.get("postal_code", ""),
                "addressCountry": data.get("country", "")
            },
            "sameAs": data.get("social_links", [])
        })
    
    elif page_type == "service":
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": data.get("title", ""),
            "description": data.get("description", ""),
            "provider": {
                "@type": "Organization",
                "name": data.get("provider_name", "Educational Consultancy")
            },
            "areaServed": data.get("countries", []),
            "offers": {
                "@type": "Offer",
                "price": data.get("price", ""),
                "priceCurrency": "USD"
            }
        })
    
    elif page_type == "article":
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": data.get("title", ""),
            "description": data.get("description", ""),
            "image": data.get("image", ""),
            "datePublished": data.get("published_date", ""),
            "dateModified": data.get("modified_date", ""),
            "author": {
                "@type": "Person",
                "name": data.get("author", "")
            },
            "publisher": {
                "@type": "Organization",
                "name": "Educational Consultancy",
                "logo": {
                    "@type": "ImageObject",
                    "url": "/images/logo.png"
                }
            }
        })
    
    elif page_type == "faq":
        faq_elements = []
        for item in data.get("questions", []):
            faq_elements.append({
                "@type": "Question",
                "name": item.get("question", ""),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.get("answer", "")
                }
            })
        
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faq_elements
        })
    
    elif page_type == "video":
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": data.get("title", ""),
            "description": data.get("description", ""),
            "thumbnailUrl": data.get("thumbnail", ""),
            "uploadDate": data.get("upload_date", ""),
            "duration": data.get("duration", ""),
            "contentUrl": data.get("video_url", ""),
            "embedUrl": data.get("embed_url", ""),
            "interactionCount": data.get("views", 0)
        })
    
    return None

def generate_meta_tags(
    title: str,
    description: str,
    keywords: Optional[str] = None,
    image: Optional[str] = None,
    url: Optional[str] = None,
    type: str = "website"
) -> Dict[str, str]:
    """Generate meta tags for SEO"""
    meta_tags = {
        "title": title,
        "description": description,
        "og:title": title,
        "og:description": description,
        "og:type": type,
        "twitter:card": "summary_large_image",
        "twitter:title": title,
        "twitter:description": description
    }
    
    if keywords:
        meta_tags["keywords"] = keywords
    
    if image:
        meta_tags["og:image"] = image
        meta_tags["twitter:image"] = image
    
    if url:
        meta_tags["og:url"] = url
        meta_tags["canonical"] = url
    
    return meta_tags
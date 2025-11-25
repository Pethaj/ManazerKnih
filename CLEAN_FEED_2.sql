-- Vymazat embeddings pro Feed 2
DELETE FROM product_embeddings WHERE feed_source = 'feed_2';

-- Vymazat produkty Feed 2
DELETE FROM product_feed_2;


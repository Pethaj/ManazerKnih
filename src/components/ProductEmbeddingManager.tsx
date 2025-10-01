/**
 * Product Embedding Manager - Výběr produktů z products tabulky pro embedding
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateEmbedding, saveEmbedding } from '../services/embeddingService';

interface Product {
  id: number;
  product_code: string;
  name: string; // z products tabulky
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  has_embedding: boolean; // zda už má embedding
  embedding_status: 'none' | 'pending' | 'processing' | 'completed' | 'error';
  embedding_generated_at: string | null;
}

interface ProductEmbeddingManagerProps {
  onClose: () => void;
}

export const ProductEmbeddingManager: React.FC<ProductEmbeddingManagerProps> = ({ onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [n8nProcessing, setN8nProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [progress, setProgress] = useState({ current: 0, total: 0, productName: '' });
  const [n8nProgress, setN8nProgress] = useState({ current: 0, total: 0, productName: '' });

  // Načti produkty z products tabulky + status embeddingů
  const loadProducts = useCallback(async () => {
    setLoading(true);
    console.log('🔍 Načítám produkty z products tabulky...');
    
    try {
      // 1. Načti všechny produkty
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_code, name, description, category, price, currency, product_url, image_url')
        .order('name');

      console.log('📊 Products response:', { productsData, productsError });

      if (productsError) {
        console.error('❌ Chyba při načítání produktů:', productsError);
        alert(`Chyba při načítání produktů: ${productsError.message}`);
        return;
      }

      // 2. Načti embeddingy (pokud existují)
      const { data: embeddingsData, error: embeddingsError } = await supabase
        .from('product_embeddings')
        .select('product_code, embedding_status, embedding_generated_at');

      console.log('📊 Embeddings response:', { embeddingsData, embeddingsError });

      if (embeddingsError) {
        console.warn('⚠️ Chyba při načítání embeddingů (možná tabulka neexistuje):', embeddingsError);
      }

      // 3. Propoj data
      const embeddingsMap = new Map();
      if (embeddingsData) {
        embeddingsData.forEach(embedding => {
          embeddingsMap.set(embedding.product_code, embedding);
        });
      }

      // 4. Transformuj data
      const transformedProducts: Product[] = (productsData || []).map(product => {
        const embedding = embeddingsMap.get(product.product_code);
        
        return {
          id: product.id,
          product_code: product.product_code,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          currency: product.currency,
          product_url: product.product_url,
          image_url: product.image_url,
          has_embedding: !!embedding,
          embedding_status: embedding ? embedding.embedding_status : 'none',
          embedding_generated_at: embedding ? embedding.embedding_generated_at : null,
        };
      });

      console.log(`✅ Načteno ${transformedProducts.length} produktů`);
      setProducts(transformedProducts);
    } catch (error) {
      console.error('❌ Chyba při načítání produktů:', error);
      alert(`Chyba při načítání produktů: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtrované produkty
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'no_embedding' && !product.has_embedding) ||
                         (statusFilter === 'has_embedding' && product.has_embedding) ||
                         product.embedding_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Statistiky
  const stats = {
    total: products.length,
    no_embedding: products.filter(p => !p.has_embedding).length,
    pending: products.filter(p => p.embedding_status === 'pending').length,
    completed: products.filter(p => p.embedding_status === 'completed').length,
    error: products.filter(p => p.embedding_status === 'error').length,
  };

  // Výběr všech/žádných
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Přepnutí výběru jednotlivého produktu
  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Funkce pro odesílání na N8N webhook
  const handleSendToN8N = async () => {
    const selectedProductsArray = products.filter(p => selectedProducts.has(p.id));
    
    if (selectedProductsArray.length === 0) {
      alert('Vyberte alespoň jeden produkt pro odeslání na N8N webhook.');
      return;
    }

    setN8nProcessing(true);
    setN8nProgress({ current: 0, total: 1, productName: 'Příprava dat...' });

    const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/15210f31-7432-4002-aaa8-4026c462aa29';

    try {
      console.log(`📤 Odesílám ${selectedProductsArray.length} produktů na N8N webhook`);

      // Připrav data všech produktů
      const allProductsData = {
        products: selectedProductsArray.map(product => ({
          id: product.id,
          product_code: product.product_code,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          currency: product.currency,
          product_url: product.product_url,
          image_url: product.image_url,
          has_embedding: product.has_embedding,
          embedding_status: product.embedding_status,
          embedding_generated_at: product.embedding_generated_at,
          // Celý obsah produktu jako kombinace všech polí
          full_content: `${product.name}\n${product.description || ''}\nKategorie: ${product.category || ''}\nCena: ${product.price ? `${product.price} ${product.currency}` : 'Neuvedena'}\nKód produktu: ${product.product_code}`,
        })),
        total_count: selectedProductsArray.length,
        timestamp: new Date().toISOString(),
        batch_id: `batch_${Date.now()}`
      };

      setN8nProgress({ current: 1, total: 2, productName: 'Odesílám data...' });

      // Odešli všechny produkty najednou
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allProductsData)
      });

      if (!response.ok) {
        console.error(`Chyba při odesílání produktů:`, response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setN8nProgress({ current: 2, total: 2, productName: 'Zpracovávám odpověď...' });

      // Zpracuj odpověď z webhoku
      let responseData;
      try {
        responseData = await response.json();
        console.log('📥 Odpověď z N8N webhook:', responseData);
      } catch (error) {
        console.warn('⚠️ Nepodařilo se parsovat odpověď jako JSON:', error);
        responseData = { success: true, message: 'Odpověď přijata bez JSON formátu' };
      }

      // Vyhodnoť výsledek podle odpovědi z webhoku
      if (responseData.success === true || responseData.status === 'success' || response.status === 200) {
        console.log(`✅ Úspěšně odesláno ${selectedProductsArray.length} produktů na N8N webhook`);
        
        // Resetuj výběr po úspěšném odeslání
        setSelectedProducts(new Set());
        
        // Vytvoř detailní zprávu o výsledku
        let successMessage = `✅ Úspěšně odesláno ${selectedProductsArray.length} produktů na N8N webhook`;
        
        if (responseData.message) {
          successMessage += `\n\n📋 Odpověď webhoku: ${responseData.message}`;
        }
        
        if (responseData.processed_count !== undefined) {
          successMessage += `\n📊 Zpracováno: ${responseData.processed_count} produktů`;
        }
        
        if (responseData.batch_id) {
          successMessage += `\n🆔 Batch ID: ${responseData.batch_id}`;
        }
        
        if (responseData.processing_time) {
          successMessage += `\n⏱️ Doba zpracování: ${responseData.processing_time}`;
        }
        
        alert(successMessage);
      } else {
        // Webhook vrátil chybu
        console.error('❌ Webhook vrátil chybu:', responseData);
        
        let errorMessage = `❌ Webhook vrátil chybu`;
        
        if (responseData.message || responseData.error) {
          errorMessage += `\n\n📋 Chybová zpráva: ${responseData.message || responseData.error}`;
        }
        
        if (responseData.failed_count !== undefined) {
          errorMessage += `\n📊 Neúspěšných: ${responseData.failed_count} produktů`;
        }
        
        if (responseData.batch_id) {
          errorMessage += `\n🆔 Batch ID: ${responseData.batch_id}`;
        }
        
        alert(errorMessage);
        return; // Neházej exception, jen zobraz chybu
      }

    } catch (error) {
      console.error('❌ Chyba při odesílání na N8N webhook:', error);
      alert(`❌ Chyba při komunikaci s N8N webhook:\n\n${error}`);
    } finally {
      setN8nProcessing(false);
      setN8nProgress({ current: 0, total: 0, productName: '' });
    }
  };

  // Spuštění embeddingu pro vybrané produkty
  const handleRunEmbedding = async () => {
    const selectedProductsArray = products.filter(p => selectedProducts.has(p.id));
    
    if (selectedProductsArray.length === 0) {
      alert('Vyberte alespoň jeden produkt pro embedding.');
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: selectedProductsArray.length, productName: '' });

    try {
      // Zpracuj každý produkt
      for (let i = 0; i < selectedProductsArray.length; i++) {
        const product = selectedProductsArray[i];
        
        setProgress({ 
          current: i + 1, 
          total: selectedProductsArray.length, 
          productName: product.name 
        });

        try {
          console.log(`🔄 Zpracovávám produkt: ${product.name}`);

          // 1. Zkopíruj produkt do product_embeddings (pokud tam ještě není)
          const { error: insertError } = await supabase
            .from('product_embeddings')
            .upsert({
              product_code: product.product_code,
              product_name: product.name,
              description: product.description,
              category: product.category,
              price: product.price,
              product_url: product.product_url,
              image_url: product.image_url,
              currency: product.currency,
              search_text: `${product.name} ${product.description || ''} ${product.category || ''}`.trim(),
              embedding_status: 'processing',
              synced_from_products_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'product_code'
            });

          if (insertError) {
            console.error('Chyba při vkládání do product_embeddings:', insertError);
            continue;
          }

          // 2. Vygeneruj embedding
          const textForEmbedding = `${product.name} ${product.description || ''} ${product.category || ''}`.trim();
          
          if (!textForEmbedding) {
            await supabase
              .from('product_embeddings')
              .update({ embedding_status: 'error' })
              .eq('product_code', product.product_code);
            continue;
          }

          const embeddingResult = await generateEmbedding(textForEmbedding);

          if (embeddingResult.success && embeddingResult.embedding) {
            // 3. Ulož embedding do product_embeddings
            const { error: updateError } = await supabase
              .from('product_embeddings')
              .update({
                embedding: `[${embeddingResult.embedding.join(',')}]`, // PostgreSQL vector format
                embedding_status: 'completed',
                embedding_generated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('product_code', product.product_code);

            if (updateError) {
              console.error('Chyba při ukládání embeddingu:', updateError);
              await supabase
                .from('product_embeddings')
                .update({ embedding_status: 'error' })
                .eq('product_code', product.product_code);
            } else {
              console.log(`✅ Embedding úspěšně uložen pro: ${product.name}`);
            }
          } else {
            await supabase
              .from('product_embeddings')
              .update({ embedding_status: 'error' })
              .eq('product_code', product.product_code);
          }

          // Malá pauza mezi requesty
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`Chyba při zpracování produktu ${product.name}:`, error);
          await supabase
            .from('product_embeddings')
            .update({ embedding_status: 'error' })
            .eq('product_code', product.product_code);
        }
      }

      // Resetuj výběr a načti produkty znovu
      setSelectedProducts(new Set());
      await loadProducts();

    } catch (error) {
      console.error('Chyba při zpracování embeddingů:', error);
    } finally {
      setProcessing(false);
      setProgress({ current: 0, total: 0, productName: '' });
    }
  };

  // Ikony
  const IconClose = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  const IconRefresh = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  );

  // Status badge
  const getStatusBadge = (status: string, hasEmbedding: boolean) => {
    if (!hasEmbedding) {
      return (
        <span style={{ ...styles.statusBadge, backgroundColor: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6' }}>
          Bez embeddingu
        </span>
      );
    }

    const badgeStyles = {
      pending: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' },
      processing: { backgroundColor: '#cce5ff', color: '#004085', border: '1px solid #74b9ff' },
      completed: { backgroundColor: '#d1edff', color: '#155724', border: '1px solid #74b9ff' },
      error: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #fd79a8' },
    };

    const labels = {
      pending: 'Čeká',
      processing: 'Zpracovává se',
      completed: 'Dokončeno',
      error: 'Chyba',
    };

    return (
      <span style={{
        ...styles.statusBadge,
        ...badgeStyles[status as keyof typeof badgeStyles],
      }}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Produktový Feed - Embeddingy</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <IconClose />
          </button>
        </div>

        {/* Statistiky */}
        <div style={styles.statsSection}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.total}</div>
              <div style={styles.statLabel}>Celkem</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.no_embedding}</div>
              <div style={styles.statLabel}>Bez embeddingu</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.pending}</div>
              <div style={styles.statLabel}>Čeká</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.completed}</div>
              <div style={styles.statLabel}>Hotovo</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.error}</div>
              <div style={styles.statLabel}>Chyby</div>
            </div>
          </div>
        </div>

        {/* Ovládání */}
        <div style={styles.controlsSection}>
          <div style={styles.controlsRow}>
            <input
              type="text"
              placeholder="Vyhledat produkty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.statusSelect}
            >
              <option value="all">Všechny statusy</option>
              <option value="no_embedding">Bez embeddingu</option>
              <option value="pending">Čeká</option>
              <option value="processing">Zpracovává se</option>
              <option value="completed">Dokončeno</option>
              <option value="error">Chyba</option>
            </select>

            <button style={styles.refreshButton} onClick={loadProducts}>
              <IconRefresh />
            </button>
          </div>

          <div style={styles.actionRow}>
            <div style={styles.selectionInfo}>
              Vybráno: {selectedProducts.size} z {filteredProducts.length}
            </div>
            
            <div style={styles.actionButtons}>
              <button
                style={styles.selectAllButton}
                onClick={handleSelectAll}
              >
                {selectedProducts.size === filteredProducts.length ? 'Zrušit výběr' : 'Vybrat vše'}
              </button>
              
              <button
                style={styles.embeddingButton}
                onClick={handleRunEmbedding}
                disabled={selectedProducts.size === 0 || processing || n8nProcessing}
              >
                {processing ? 'Zpracovává se...' : `Spustit Embedding (${selectedProducts.size})`}
              </button>
              
              <button
                style={styles.n8nButton}
                onClick={handleSendToN8N}
                disabled={selectedProducts.size === 0 || processing || n8nProcessing}
              >
                {n8nProcessing ? 'Odesílá se...' : `N8N Embedding (${selectedProducts.size})`}
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        {processing && (
          <div style={styles.progressSection}>
            <div style={styles.progressText}>
              Embedding: {progress.current} / {progress.total} - {progress.productName}
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${(progress.current / progress.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* N8N Progress */}
        {n8nProcessing && (
          <div style={styles.progressSection}>
            <div style={styles.progressText}>
              N8N Webhook: {n8nProgress.current} / {n8nProgress.total} - {n8nProgress.productName}
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  backgroundColor: '#28a745',
                  width: `${(n8nProgress.current / n8nProgress.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Tabulka */}
        <div style={styles.tableSection}>
          {loading ? (
            <div style={styles.loading}>Načítám produkty...</div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={handleSelectAll}
                        style={styles.checkbox}
                      />
                    </th>
                    <th style={styles.tableHeaderCell}>Kód</th>
                    <th style={styles.tableHeaderCell}>Název</th>
                    <th style={styles.tableHeaderCell}>Kategorie</th>
                    <th style={styles.tableHeaderCell}>Cena</th>
                    <th style={styles.tableHeaderCell}>Status</th>
                    <th style={styles.tableHeaderCell}>Embedding</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.productCode}>{product.product_code}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.productName}>{product.name}</div>
                        {product.description && (
                          <div style={styles.productDescription}>
                            {product.description.substring(0, 100)}...
                          </div>
                        )}
                      </td>
                      <td style={styles.tableCell}>{product.category || '-'}</td>
                      <td style={styles.tableCell}>
                        {product.price ? `${product.price} ${product.currency}` : '-'}
                      </td>
                      <td style={styles.tableCell}>
                        {getStatusBadge(product.embedding_status, product.has_embedding)}
                      </td>
                      <td style={styles.tableCell}>
                        {product.embedding_generated_at ? 
                          new Date(product.embedding_generated_at).toLocaleDateString('cs-CZ') : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div style={styles.noResults}>
                  Žádné produkty nenalezeny.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1000,
    padding: '20px',
    overflow: 'auto',
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    color: '#666',
    transition: 'all 0.2s',
  },

  statsSection: {
    padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
  },

  statCard: {
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },

  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },

  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },

  controlsSection: {
    padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
  },

  controlsRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '12px',
  },

  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },

  statusSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '180px',
  },

  refreshButton: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'white',
    color: '#666',
  },

  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  selectionInfo: {
    fontSize: '14px',
    color: '#666',
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
  },

  selectAllButton: {
    padding: '8px 16px',
    border: '1px solid #007bff',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'white',
    color: '#007bff',
    fontSize: '14px',
  },

  embeddingButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '14px',
  },

  n8nButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: '#28a745',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },

  progressSection: {
    padding: '16px 24px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
  },

  progressText: {
    fontSize: '14px',
    marginBottom: '8px',
    color: '#333',
  },

  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    transition: 'width 0.3s ease',
  },

  tableSection: {
    flex: 1,
    overflow: 'auto',
  },

  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },

  tableContainer: {
    overflow: 'auto',
    maxHeight: '100%',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },

  tableHeaderRow: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },

  tableHeaderCell: {
    padding: '12px 8px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    position: 'sticky',
    top: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 10,
  },

  tableRow: {
    borderBottom: '1px solid #e9ecef',
    transition: 'background-color 0.2s',
  },

  tableCell: {
    padding: '12px 8px',
    verticalAlign: 'top',
  },

  checkbox: {
    cursor: 'pointer',
  },

  productCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#666',
  },

  productName: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },

  productDescription: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },

  noResults: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '666',
    fontStyle: 'italic',
  },
};

export default ProductEmbeddingManager;
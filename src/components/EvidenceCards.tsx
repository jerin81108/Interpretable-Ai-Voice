import React, { useState } from 'react';
import { AlertCircle, HelpCircle, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { EvidenceCard } from '../types/screening';

interface EvidenceCardsProps {
  cards: EvidenceCard[];
}

export const EvidenceCards: React.FC<EvidenceCardsProps> = ({ cards }) => {
  const [filter, setFilter] = useState<'all' | 'synthetic_leaning' | 'natural_leaning' | 'neutral_or_inconclusive'>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredCards = cards.filter((card) => {
    if (filter === 'all') return true;
    if (filter === 'synthetic_leaning') return card.direction === 'synthetic_leaning';
    if (filter === 'natural_leaning') return card.direction === 'natural_leaning';
    if (filter === 'neutral_or_inconclusive') return card.direction === 'neutral' || card.validity !== 'usable';
    return true;
  });

  const getDirectionBadge = (card: EvidenceCard) => {
    if (card.validity === 'unavailable') {
      return (
        <span className="outcome-pill inconclusive" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
          <HelpCircle size={13} />
          Unavailable
        </span>
      );
    }
    switch (card.direction) {
      case 'synthetic_leaning':
        return (
          <span className="outcome-pill synthetic_leaning" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
            <ShieldAlert size={13} />
            Synthetic-leaning
          </span>
        );
      case 'natural_leaning':
        return (
          <span className="outcome-pill natural_leaning" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
            <CheckCircle2 size={13} />
            Natural-leaning
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="outcome-pill inconclusive" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
            <Info size={13} />
            Neutral / Baseline
          </span>
        );
    }
  };

  const getValidityBadge = (validity: EvidenceCard['validity']) => {
    switch (validity) {
      case 'usable':
        return <span className="meta-chip" style={{ color: '#4ade80' }}>Data: Usable</span>;
      case 'limited':
        return <span className="meta-chip" style={{ color: '#fbbf24' }}>Data: Limited</span>;
      case 'unavailable':
        return <span className="meta-chip" style={{ color: '#f87171' }}>Data: Unavailable</span>;
    }
  };

  return (
    <section className="evidence-section" aria-labelledby="evidence-cards-heading">
      <div className="evidence-header-row">
        <div className="section-title-wrap">
          <h3 id="evidence-cards-heading" className="section-heading">
            Measurable Acoustic Evidence
          </h3>
          <p className="section-subheading">
            Detailed inspection cards for extracted acoustic features, thresholds, and caveats.
          </p>
        </div>

        <div className="filter-pills-row" role="tablist" aria-label="Evidence filter">
          <button
            type="button"
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({cards.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'synthetic_leaning' ? 'active' : ''}`}
            onClick={() => setFilter('synthetic_leaning')}
          >
            Synthetic-leaning ({cards.filter((c) => c.direction === 'synthetic_leaning').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'natural_leaning' ? 'active' : ''}`}
            onClick={() => setFilter('natural_leaning')}
          >
            Natural-leaning ({cards.filter((c) => c.direction === 'natural_leaning').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'neutral_or_inconclusive' ? 'active' : ''}`}
            onClick={() => setFilter('neutral_or_inconclusive')}
          >
            Neutral / Inconclusive ({cards.filter((c) => c.direction === 'neutral' || c.validity !== 'usable').length})
          </button>
        </div>
      </div>

      <div className="evidence-cards-grid">
        {filteredCards.map((card) => {
          const isExpanded = expandedCards[card.id] ?? true; // Default open for first review
          return (
            <article key={card.id} className="evidence-card" aria-label={card.title}>
              <div className="evidence-card-top">
                <div className="card-title-group">
                  <h4 className="card-title">{card.title}</h4>
                  <span className="card-method-text">{card.measurementMethod}</span>
                </div>
                <div className="card-status-badges">
                  {getDirectionBadge(card)}
                  {getValidityBadge(card.validity)}
                </div>
              </div>

              {/* Measured Value Banner */}
              <div className="card-measured-banner">
                <div>
                  <div className="measured-val-label">Measured Value</div>
                  <div className="measured-val-text">{card.measuredValueFormatted}</div>
                </div>
                <div style={{ textAlign: 'right', maxWidth: '240px' }}>
                  <div className="measured-val-label">Expected Human Baseline</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {card.baselineExpectedText}
                  </div>
                </div>
              </div>

              {/* Toggle Questions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Parameters: {card.parameters}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleExpand(card.id)}
                  aria-expanded={isExpanded}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                >
                  {isExpanded ? (
                    <>
                      Hide Details <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      View 5-Point Analysis <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="card-five-questions">
                  {/* Q1 */}
                  <div className="qa-block">
                    <span className="qa-question">1. What was measured?</span>
                    <p className="qa-answer">{card.whatWasMeasured}</p>
                  </div>

                  {/* Q2 */}
                  <div className="qa-block">
                    <span className="qa-question">2. What was observed?</span>
                    <p className="qa-answer">{card.whatWasObserved}</p>
                  </div>

                  {/* Q3 */}
                  <div className="qa-block">
                    <span className="qa-question">3. Why might that matter?</span>
                    <p className="qa-answer">{card.whyItMatters}</p>
                  </div>

                  {/* Q4 (Caveat/Confounder) */}
                  <div className="qa-caveat-box">
                    <div className="qa-caveat-label">
                      <AlertCircle size={14} />
                      4. Alternative Explanations & Confounders
                    </div>
                    <p className="qa-answer" style={{ color: '#fed7aa' }}>
                      {card.alternativeExplanations}
                    </p>
                  </div>

                  {/* Q5 */}
                  <div className="qa-block">
                    <span className="qa-question">5. Usable data supporting observation</span>
                    <p className="qa-answer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {card.usableDataAmount}
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

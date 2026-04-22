import { useState } from 'react';
import { useFAQ } from '../../../hooks/useFAQ';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Search, HelpCircle } from 'lucide-react';
import { FAQCategory } from './FAQCategory';

interface FAQSectionProps {
  onCreateTicket: () => void;
}

export function FAQSection({ onCreateTicket }: FAQSectionProps) {
  const { categories, searchResults, searchFAQ, loading } = useFAQ();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      setHasSearched(true);
      await searchFAQ(value);
    } else {
      setHasSearched(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Central de Ajuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busque por palavras-chave..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {hasSearched && searchResults.length === 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Não encontramos resultados para sua busca
              </p>
              <Button size="sm" onClick={onCreateTicket}>
                Criar Ticket de Suporte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results or Categories */}
      <div className="space-y-4">
        {hasSearched && searchResults.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Busca ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((item) => (
                  <div key={item.id} className="border-b pb-4 last:border-0">
                    <h4 className="font-medium mb-1">{item.question}</h4>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Categoria: {item.category?.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          !hasSearched && categories.map((category) => (
            <FAQCategory key={category.id} category={category} />
          ))
        )}
      </div>

      {/* Help Footer */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Não encontrou o que procurava?
          </p>
          <Button onClick={onCreateTicket} className="bg-moria-orange hover:bg-moria-orange/90">
            Fale com o Suporte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

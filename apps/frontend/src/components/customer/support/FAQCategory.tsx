import { useState } from 'react';
import { FAQCategory as FAQCategoryType } from '../../../api/faqService';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FAQItem } from './FAQItem';

interface FAQCategoryProps {
  category: FAQCategoryType;
}

export function FAQCategory({ category }: FAQCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {category.icon && <span>{category.icon}</span>}
            <span>{category.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({category.items.length})
            </span>
          </div>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardTitle>
        {category.description && !isExpanded && (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {category.items.map((item) => (
              <FAQItem key={item.id} item={item} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

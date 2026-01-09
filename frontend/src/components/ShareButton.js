import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const ShareButton = ({ shareText, shareUrl, buttonText = "Partager", variant = "outline" }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const textToCopy = `${shareText}\n\n${shareUrl}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Lien copié! Partagez sur vos réseaux sociaux 🎉');
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      className={variant === "outline" ? "border-purple-500 text-purple-400" : "btn-neon"}
      data-testid="share-button"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Copié!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default ShareButton;

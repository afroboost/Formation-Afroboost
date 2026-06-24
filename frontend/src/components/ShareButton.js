import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ShareButton = ({ shareText, shareUrl, buttonText = "Partager", variant = "outline", className = "" }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    const textToCopy = `${shareText}\n\n${shareUrl}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setLoading(false);
      setCopied(true);
      toast.success('Lien copié! Partagez sur vos réseaux sociaux 🎉');
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      setLoading(false);
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      className={`${variant === "outline" ? "border-purple-500 text-purple-400 btn-secondary" : "btn-neon"} ${copied ? 'success-glow' : ''} ${className}`}
      disabled={loading || copied}
      data-testid="share-button"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Copie...
        </>
      ) : copied ? (
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

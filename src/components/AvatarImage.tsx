import Image from "next/image";

interface AvatarImageProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
}

// OAuth/Supabase avatar hosts are user-controlled, so keep the existing direct
// browser loading behavior without adding an overly broad Next image allowlist.
const avatarLoader = ({ src }: { src: string }) => src;

export default function AvatarImage({ src, alt, size, className }: AvatarImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      loader={avatarLoader}
      unoptimized
      className={className}
    />
  );
}

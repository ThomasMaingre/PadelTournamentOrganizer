import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
}

export default function Logo({ className, size = 48 }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Padel Tournament Organizer"
      width={size}
      height={size}
      className={cn("rounded-lg", className)}
      priority
    />
  )
}
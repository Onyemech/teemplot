import React from 'react'
import { NavLink, NavLinkProps } from 'react-router-dom'
import { usePrefetch } from '@/hooks/usePrefetch'

interface PrefetchNavLinkProps extends NavLinkProps {
  prefetchUrl?: string
}

export function PrefetchNavLink({ prefetchUrl, onMouseEnter, ...props }: PrefetchNavLinkProps) {
  const prefetch = usePrefetch()

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetchUrl) {
      prefetch(prefetchUrl)
    }
    onMouseEnter?.(e)
  }

  return <NavLink onMouseEnter={handleMouseEnter} {...props} />
}

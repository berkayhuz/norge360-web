"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar"
import { Heading } from "@workspace/ui/components/typography/heading"
import { Text } from "@workspace/ui/components/typography/text"
import { VerifiedIcon } from "@workspace/ui/components/primitives/verified"

type UsernameVariant =
  | "full"
  | "name"
  | "name-username"
  | "name-occupation"
  | "avatar"

type UsernameSize = "sm" | "default" | "lg"

type UsernameProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string
  username?: string
  occupation?: string
  image?: string
  verified?: boolean
  variant?: UsernameVariant
  size?: UsernameSize
  headingLevel?: 1 | 2 | 3 | 4 | 5
  avatarAlt?: string
  className?: string
}

const sizeStyles: Record<
  UsernameSize,
  {
    root: string
    avatar: "sm" | "default" | "lg"
    name: string
    username: string
    occupation: string
    verified: number
  }
> = {
  sm: {
    root: "gap-2",
    avatar: "sm",
    name: "text-sm",
    username: "text-xs",
    occupation: "text-xs",
    verified: 14,
  },
  default: {
    root: "gap-2.5",
    avatar: "default",
    name: "text-base",
    username: "text-sm",
    occupation: "text-sm",
    verified: 16,
  },
  lg: {
    root: "gap-3",
    avatar: "lg",
    name: "text-lg",
    username: "text-sm",
    occupation: "text-sm",
    verified: 18,
  },
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function formatUsername(username?: string | null) {
  if (!username) return undefined

  const value = username.trim().replace(/^@+/, "")

  if (!value) return undefined

  return `@${value}`
}

function UsernameAvatar({
  name,
  image,
  avatarAlt,
  size,
}: {
  name: string
  image?: string
  avatarAlt?: string
  size: "sm" | "default" | "lg"
}) {
  return (
    <Avatar size={size}>
      {image ? (
        <AvatarImage src={image} alt={avatarAlt ?? name} />
      ) : null}

      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}

function UsernameName({
  name,
  verified,
  size,
  headingLevel,
}: {
  name: string
  verified?: boolean
  size: UsernameSize
  headingLevel: 1 | 2 | 3 | 4 | 5
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Heading
        level={headingLevel}
        className="border-0 p-0 leading-tight"
      >
        {name}
      </Heading>

      {verified ? (
        <VerifiedIcon size={sizeStyles[size].verified} className="relative top-[1px]" />
      ) : null}
    </div>
  )
}

function UsernameText({
  username,
  size,
}: {
  username?: string
  size: UsernameSize
}) {
  const formattedUsername = formatUsername(username)

  if (!formattedUsername) return null

  return (
    <Text
      className={cn(
        "mt-1 truncate leading-tight text-muted-foreground",
        sizeStyles[size].username
      )}
    >
      {formattedUsername}
    </Text>
  )
}

function UsernameOccupation({
  occupation,
  size,
}: {
  occupation?: string
  size: UsernameSize
}) {
  if (!occupation) return null

  return (
    <Text
      className={cn(
        "mt-1 truncate leading-tight text-muted-foreground",
        sizeStyles[size].occupation
      )}
    >
      {occupation}
    </Text>
  )
}

function Username({
  name,
  username,
  occupation,
  image,
  verified = false,
  variant = "full",
  size = "default",
  headingLevel = 5,
  avatarAlt,
  className,
  ...props
}: UsernameProps) {
  const styles = sizeStyles[size]

  if (variant === "avatar") {
    return (
      <div
        className={cn("inline-flex shrink-0 items-center", className)}
        {...props}
      >
        <UsernameAvatar
          name={name}
          image={image}
          avatarAlt={avatarAlt}
          size={styles.avatar}
        />
      </div>
    )
  }

  if (variant === "name") {
    return (
      <div className={cn("min-w-0", className)} {...props}>
        <UsernameName
          name={name}
          verified={verified}
          size={size}
          headingLevel={headingLevel}
        />
      </div>
    )
  }

  if (variant === "name-username") {
    return (
      <div className={cn("min-w-0", className)} {...props}>
        <UsernameName
          name={name}
          verified={verified}
          size={size}
          headingLevel={headingLevel}
        />

        <UsernameText username={username} size={size} />
      </div>
    )
  }

  if (variant === "name-occupation") {
    return (
      <div className={cn("min-w-0", className)} {...props}>
        <UsernameName
          name={name}
          verified={verified}
          size={size}
          headingLevel={headingLevel}
        />

        <UsernameOccupation occupation={occupation} size={size} />
      </div>
    )
  }

  return (
    <div
      className={cn("flex min-w-0 items-center", styles.root, className)}
      {...props}
    >
      <UsernameAvatar
        name={name}
        image={image}
        avatarAlt={avatarAlt}
        size={styles.avatar}
      />

      <div className="min-w-0">
        <UsernameName
          name={name}
          verified={verified}
          size={size}
          headingLevel={headingLevel}
        />

        <UsernameText username={username} size={size} />
      </div>
    </div>
  )
}

export { Username }

export type { UsernameProps, UsernameVariant, UsernameSize }

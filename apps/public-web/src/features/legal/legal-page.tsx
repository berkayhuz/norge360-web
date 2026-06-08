import Link from "next/link";

import { Badge } from "@workspace/ui/components/data-display/badge";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

import type { LegalPageContent } from "./legal-content";

type LegalPageProps = {
  content: LegalPageContent;
};

export function LegalPage({ content }: LegalPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
      <Card className="overflow-hidden border-border/70 bg-card/90">
        <div className="bg-gradient-to-r from-foreground/10 via-transparent to-transparent px-6 py-8">
          <Badge variant="secondary" className="mb-4">
            Norge360
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{content.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{content.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/help">Help</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/discover-hub">Discover hub</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4">
        {content.sections.map((section) => (
          <Card key={section.title} className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}

        <Card className="border-border/70 bg-muted/30">
          <CardContent className="space-y-3 px-6 py-5 text-sm leading-6 text-muted-foreground">
            <p>{content.contactNote}</p>
            <p>
              Need another route? Try{" "}
              <Link href="/services" className="font-medium text-foreground underline-offset-4 hover:underline">
                Services
              </Link>
              {" "}or{" "}
              <Link href="/about" className="font-medium text-foreground underline-offset-4 hover:underline">
                About
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

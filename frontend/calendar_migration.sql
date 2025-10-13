-- CreateTable: Calendar
CREATE TABLE "calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "userid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CalendarEvent
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendarid" TEXT NOT NULL,
    "scheduleddate" TIMESTAMP(3) NOT NULL,
    "weekday" TEXT NOT NULL,
    "contentformat" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "topic" TEXT,
    "duration" INTEGER,
    "resolution" TEXT,
    "aspectratio" TEXT,
    "avatarStyle" TEXT,
    "slidecount" INTEGER,
    "prompttemplate" TEXT,
    "generatedprompt" TEXT,
    "generatedassets" JSONB,
    "caption" TEXT,
    "hashtags" TEXT[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "cta" TEXT,
    "platforms" TEXT[] DEFAULT ARRAY['instagram', 'facebook']::TEXT[],
    "instagramposts" JSONB,
    "facebookposts" JSONB,
    "videovariables" JSONB,
    "carouselvariables" JSONB,
    "silentvideovariables" JSONB,
    "veomodel" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxoutputtokens" INTEGER,
    "persongeneration" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "needsapproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedby" TEXT,
    "approvedat" TIMESTAMP(3),
    "publishedat" TIMESTAMP(3),
    "failurereason" TEXT,
    "retrycount" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContentTemplate
CREATE TABLE "content_templates" (
    "id" TEXT NOT NULL,
    "calendarid" TEXT,
    "name" TEXT NOT NULL,
    "contentformat" TEXT NOT NULL,
    "product" TEXT,
    "prompten" TEXT,
    "promptpt" TEXT,
    "promptes" TEXT,
    "variables" JSONB,
    "duration" INTEGER,
    "resolution" TEXT,
    "aspectratio" TEXT,
    "veomodel" TEXT NOT NULL DEFAULT 'veo-3.0-generate-preview',
    "temperature" DOUBLE PRECISION,
    "maxoutputtokens" INTEGER,
    "persongeneration" BOOLEAN NOT NULL DEFAULT false,
    "usagecount" INTEGER NOT NULL DEFAULT 0,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BrandGuideline
CREATE TABLE "brand_guidelines" (
    "id" TEXT NOT NULL,
    "calendarid" TEXT NOT NULL,
    "brandname" TEXT NOT NULL,
    "logourl" TEXT,
    "colorpalette" JSONB,
    "toneofvoice" TEXT,
    "forbiddenphrases" JSONB,
    "requireddisclaimers" JSONB,
    "avatarrealisticid" TEXT,
    "avatarcartoonid" TEXT,
    "phonenumber" TEXT,
    "website" TEXT,
    "email" TEXT,
    "defaulthashtags" TEXT[],
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_guidelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_guidelines_calendarid_key" ON "brand_guidelines"("calendarid");

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarid_fkey" FOREIGN KEY ("calendarid") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_calendarid_fkey" FOREIGN KEY ("calendarid") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_guidelines" ADD CONSTRAINT "brand_guidelines_calendarid_fkey" FOREIGN KEY ("calendarid") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

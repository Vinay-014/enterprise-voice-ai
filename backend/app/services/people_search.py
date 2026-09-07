import re
from typing import List, Dict, Any
try:
    from app.schemas import ExtractedJDMetadata, CandidateProfileItem
except ImportError:
    from ..schemas import ExtractedJDMetadata, CandidateProfileItem

KNOWN_SKILLS = [
    "Python", "FastAPI", "React", "Next.js", "TypeScript", "JavaScript",
    "Node.js", "SQL", "PostgreSQL", "SQLite", "Docker", "Kubernetes",
    "AWS", "GCP", "GraphQL", "Redis", "Kafka", "REST APIs", "Microservices",
    "Tailwind CSS", "Machine Learning", "NLP", "Voice AI", "System Design",
    "CI/CD", "Terraform", "Agile", "Linux", "PyTorch", "Pandas"
]

CANDIDATE_POOL = [
    {
        "candidate_id": "cand_01",
        "name": "Priya Sharma",
        "title": "Lead Distributed Systems Architect",
        "location": "Bengaluru, Karnataka, India",
        "contact_phone": "+91-98450-71234",
        "email": "priya.sharma@cloudcore.in",
        "skills": ["Python", "FastAPI", "Kafka", "Docker", "Kubernetes", "PostgreSQL", "Redis", "System Design"],
        "experience_years": 8,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_02",
        "name": "Marcus Aurelius Vance",
        "title": "Staff Backend & Platform Architect",
        "location": "Zurich, Switzerland",
        "contact_phone": "+41-44-668-0198",
        "email": "marcus.vance@infralabs.ch",
        "skills": ["Python", "FastAPI", "Microservices", "Docker", "Kubernetes", "AWS", "SQL", "System Design"],
        "experience_years": 10,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_03",
        "name": "Sarah Chen",
        "title": "Principal Full-Stack Engineer",
        "location": "Singapore / APAC",
        "contact_phone": "+65-6712-0142",
        "email": "sarah.chen@techconnect.sg",
        "skills": ["TypeScript", "Next.js", "React", "Python", "FastAPI", "Docker", "PostgreSQL", "Tailwind CSS"],
        "experience_years": 7,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_04",
        "name": "Elena Weber",
        "title": "Senior Cloud & DevOps Infrastructure Lead",
        "location": "Munich, Bavaria, Germany",
        "contact_phone": "+49-89-2018-0129",
        "email": "elena.weber@codenetwork.de",
        "skills": ["Docker", "Kubernetes", "Terraform", "AWS", "GCP", "CI/CD", "Linux", "Python"],
        "experience_years": 6,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_05",
        "name": "Amina Al-Mansoor",
        "title": "Voice AI & Conversational NLP Engineer",
        "location": "Dubai, UAE / London, UK",
        "contact_phone": "+44-20-7946-0174",
        "email": "amina.mansoor@speechpulse.co.uk",
        "skills": ["Voice AI", "NLP", "Python", "FastAPI", "REST APIs", "Machine Learning", "PyTorch"],
        "experience_years": 5,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_06",
        "name": "Kenji Tanaka",
        "title": "Senior Machine Learning Systems Engineer",
        "location": "Tokyo, Japan",
        "contact_phone": "+81-3-5555-0131",
        "email": "kenji.tanaka@devstack.jp",
        "skills": ["Python", "PyTorch", "Machine Learning", "FastAPI", "Docker", "PostgreSQL", "System Design"],
        "experience_years": 7,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_07",
        "name": "Aditya Varma",
        "title": "Senior Full-Stack & Voice AI Engineer",
        "location": "Hyderabad, Telangana, India",
        "contact_phone": "+91-98765-43210",
        "email": "aditya.varma@voicegrid.in",
        "skills": ["React", "Next.js", "TypeScript", "Python", "FastAPI", "REST APIs", "Voice AI"],
        "experience_years": 5,
        "outreach_status": "Ready for Reachout"
    },
    {
        "candidate_id": "cand_08",
        "name": "David Van Der Beek",
        "title": "Lead Platform Reliability & Cloud Architect",
        "location": "Amsterdam / Rotterdam, Netherlands",
        "contact_phone": "+31-20-798-0188",
        "email": "david.beek@scalecloud.nl",
        "skills": ["Docker", "Kubernetes", "AWS", "GCP", "Terraform", "CI/CD", "Linux", "Python"],
        "experience_years": 8,
        "outreach_status": "Ready for Reachout"
    }
]

class PeopleSearchService:
    def extract_metadata(self, jd_text: str) -> ExtractedJDMetadata:
        text_lower = jd_text.lower()

        # Skill matching
        matched_skills = []
        for skill in KNOWN_SKILLS:
            pattern = rf"\b{re.escape(skill.lower())}\b"
            if re.search(pattern, text_lower):
                matched_skills.append(skill)

        if not matched_skills:
            # Fallback default core skills
            matched_skills = ["Python", "FastAPI", "TypeScript", "React"]

        # Experience determination
        experience_level = "Mid-Senior Level"
        if any(term in text_lower for term in ["principal", "staff", "architect", "lead", "10+ years"]):
            experience_level = "Staff / Principal (8-12+ yrs)"
        elif any(term in text_lower for term in ["senior", "5+ years", "6+ years", "7+ years"]):
            experience_level = "Senior Level (5-8 yrs)"
        elif any(term in text_lower for term in ["junior", "entry", "intern", "1-2 years"]):
            experience_level = "Junior / Associate (1-3 yrs)"

        # Domain determination
        domain = "Enterprise Software Engineering"
        if any(term in text_lower for term in ["voice", "telephony", "ivr", "audio", "speech"]):
            domain = "Voice AI & Telephony Engineering"
        elif any(term in text_lower for term in ["devops", "cloud", "infra", "kubernetes", "sre"]):
            domain = "Cloud Platform & DevOps"
        elif any(term in text_lower for term in ["frontend", "ui", "ux", "web"]):
            domain = "Frontend & UI Systems"
        elif any(term in text_lower for term in ["data", "machine learning", "ml", "ai"]):
            domain = "AI & Machine Learning Systems"

        suggested_locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Remote (US)"]

        return ExtractedJDMetadata(
            domain=domain,
            experience_level=experience_level,
            extracted_skills=matched_skills,
            suggested_locations=suggested_locations
        )

    def search_candidates(self, jd_text: str) -> List[CandidateProfileItem]:
        metadata = self.extract_metadata(jd_text)
        required_skills = set(s.lower() for s in metadata.extracted_skills)

        results = []
        for cand in CANDIDATE_POOL:
            cand_skills = set(s.lower() for s in cand["skills"])
            intersection = required_skills.intersection(cand_skills)
            
            # Base match + intersection weighting
            base_score = 45
            if required_skills:
                skill_overlap_ratio = len(intersection) / len(required_skills)
                calculated_match = int(base_score + (skill_overlap_ratio * 50))
            else:
                calculated_match = 75

            # Experience bonus
            if "staff" in metadata.experience_level.lower() and cand["experience_years"] >= 8:
                calculated_match += 5
            elif "senior" in metadata.experience_level.lower() and cand["experience_years"] >= 5:
                calculated_match += 4

            final_match = min(max(calculated_match, 58), 98)

            results.append(
                CandidateProfileItem(
                    candidate_id=cand["candidate_id"],
                    name=cand["name"],
                    title=cand["title"],
                    location=cand["location"],
                    contact_phone=cand["contact_phone"],
                    email=cand["email"],
                    skills=cand["skills"],
                    experience_years=cand["experience_years"],
                    match_percentage=final_match,
                    outreach_status=cand["outreach_status"]
                )
            )

        # Sort descending by match percentage
        results.sort(key=lambda x: x.match_percentage, reverse=True)
        return results

people_search_service = PeopleSearchService()

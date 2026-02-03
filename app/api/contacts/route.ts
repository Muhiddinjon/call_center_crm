import { NextRequest, NextResponse } from 'next/server';
import { getAllContacts, saveContact, searchContacts } from '@/lib/redis';

// GET - Get all contacts or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (query) {
      const contacts = await searchContacts(query);
      return NextResponse.json(contacts);
    }

    const contacts = await getAllContacts();
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Save a contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, name, notes, createdBy } = body;

    if (!phoneNumber || !name) {
      return NextResponse.json(
        { error: 'Phone number and name are required' },
        { status: 400 }
      );
    }

    const contact = await saveContact(phoneNumber, name, notes, createdBy);
    return NextResponse.json(contact);
  } catch (error) {
    console.error('Save contact error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
